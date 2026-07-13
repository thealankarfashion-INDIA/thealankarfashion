import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { hmacSha256Hex, timingSafeEqual } from '../_shared/crypto.ts';

type RazorpayPayment = {
  id: string;
  order_id?: string;
  status: string;
  amount?: number;
};

type RazorpayOrder = {
  id: string;
  receipt?: string;
  amount?: number;
  notes?: Record<string, string>;
};

type OrderRow = {
  id: string;
  user_id: string | null;
  data: Record<string, unknown> | null;
};

function razorpayHeaders(keyId: string, keySecret: string) {
  return {
    Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    'Content-Type': 'application/json',
  };
}

async function fetchRazorpay<T>(path: string, keyId: string, keySecret: string): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: razorpayHeaders(keyId, keySecret),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.description || 'Unable to verify payment with Razorpay');
  }
  return payload as T;
}

function amountPaiseFrom(order: OrderRow | null, fallback?: number) {
  if (Number.isFinite(fallback) && Number(fallback) >= 0) return Math.round(Number(fallback));
  const total = Number(order?.data?.total || 0);
  return Number.isFinite(total) && total > 0 ? Math.round(total * 100) : 0;
}

async function findExistingPayment(supabase: ReturnType<typeof createClient>, providerOrderId: string, providerPaymentId: string) {
  const byOrder = await supabase
    .from('payments')
    .select('id,order_id,user_id,status')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle();
  if (byOrder.error) console.error('Payment lookup by provider order failed', byOrder.error);
  if (byOrder.data) return byOrder.data;

  const byPayment = await supabase
    .from('payments')
    .select('id,order_id,user_id,status')
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle();
  if (byPayment.error) console.error('Payment lookup by provider payment failed', byPayment.error);
  return byPayment.data;
}

async function findLinkedOrder(
  supabase: ReturnType<typeof createClient>,
  candidates: Array<string | null | undefined>,
) {
  const orderIds = [...new Set(candidates
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim()))];

  if (orderIds.length === 0) return null;

  const { data, error } = await supabase
    .from('orders')
    .select('id,user_id,data')
    .in('id', orderIds)
    .returns<OrderRow[]>();

  if (error) {
    console.error('Order lookup failed during Razorpay verification', error);
    return null;
  }

  return orderIds
    .map((id) => data?.find((order) => order.id === id))
    .find((order): order is OrderRow => Boolean(order)) || null;
}

async function saveCapturedPayment(
  supabase: ReturnType<typeof createClient>,
  payment: { id?: string } | null,
  payload: {
    appOrderId: string;
    userId: string | null;
    providerOrderId: string;
    providerPaymentId: string;
    amountPaise: number;
    rawPayload: Record<string, unknown>;
  },
) {
  const row = {
    order_id: payload.appOrderId,
    user_id: payload.userId,
    provider: 'razorpay',
    provider_order_id: payload.providerOrderId,
    provider_payment_id: payload.providerPaymentId,
    status: 'captured',
    amount_paise: payload.amountPaise,
    signature_verified: true,
    raw_payload: payload.rawPayload,
    updated_at: new Date().toISOString(),
  };

  if (payment?.id) {
    return await supabase.from('payments').update(row).eq('id', payment.id);
  }
  return await supabase.from('payments').insert(row);
}

async function markOrderPaid(
  supabase: ReturnType<typeof createClient>,
  appOrderId: string,
  order: OrderRow,
  razorpayPaymentId: string,
  razorpayOrderId: string,
) {
  const now = new Date().toISOString();
  return await supabase
    .from('orders')
    .update({
      data: {
        ...(order.data || {}),
        transactionId: razorpayPaymentId,
        paymentMethod: 'Razorpay',
        paymentStatus: 'Paid',
        razorpayPaymentId,
        razorpayOrderId,
        orderStatus: 'Verified',
        updatedAt: now,
      },
      updated_at: now,
    })
    .eq('id', appOrderId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => ({}));
  const { appOrderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
  if (![appOrderId, razorpay_payment_id, razorpay_order_id, razorpay_signature].every((v) => typeof v === 'string')) {
    return json({ error: 'Invalid payment payload' }, 400);
  }

  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) return json({ error: 'Razorpay keys are not configured' }, 500);

  const expected = await hmacSha256Hex(keySecret, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (!timingSafeEqual(expected, razorpay_signature)) return json({ error: 'Invalid payment signature' }, 400);

  let payment = await findExistingPayment(supabase, razorpay_order_id, razorpay_payment_id);
  if (payment?.status === 'captured' && payment.order_id === appOrderId) {
    return json({ ok: true, duplicate: true, appOrderId });
  }

  let razorpayPayment: RazorpayPayment;
  let razorpayOrder: RazorpayOrder;
  try {
    razorpayPayment = await fetchRazorpay<RazorpayPayment>(`payments/${razorpay_payment_id}`, keyId, keySecret);
    razorpayOrder = await fetchRazorpay<RazorpayOrder>(`orders/${razorpay_order_id}`, keyId, keySecret);
  } catch (error) {
    console.error('Razorpay order verification failed', error);
    return json({ error: 'Unable to confirm payment with Razorpay' }, 502);
  }

  if (
    razorpayPayment.id !== razorpay_payment_id ||
    razorpayPayment.order_id !== razorpay_order_id ||
    razorpayOrder.id !== razorpay_order_id ||
    !['captured', 'authorized'].includes(razorpayPayment.status)
  ) {
    return json({ error: 'Payment order mismatch' }, 403);
  }

  const order = await findLinkedOrder(supabase, [
    payment?.order_id,
    razorpayOrder.notes?.app_order_id,
    razorpayOrder.receipt,
    appOrderId,
  ]);
  if (!order) {
    return json({ error: 'Order not found' }, 404);
  }
  const resolvedAppOrderId = order.id;

  if (payment && payment.order_id !== resolvedAppOrderId) {
    console.warn('Reconciling Razorpay payment with its linked order', {
      paymentId: payment.id,
      existingOrderId: payment.order_id,
      requestedOrderId: appOrderId,
      resolvedAppOrderId,
    });
  }

  const paymentResult = await saveCapturedPayment(supabase, payment, {
    appOrderId: resolvedAppOrderId,
    userId: order.user_id || razorpayOrder.notes?.user_id || null,
    providerOrderId: razorpay_order_id,
    providerPaymentId: razorpay_payment_id,
    amountPaise: amountPaiseFrom(order, razorpayPayment.amount || razorpayOrder.amount),
    rawPayload: { ...body, razorpayPayment, razorpayOrder },
  });
  if (paymentResult.error) {
    console.error('Failed to save captured Razorpay payment', paymentResult.error);
    return json({ error: 'Failed to save payment status' }, 500);
  }

  const orderResult = await markOrderPaid(supabase, resolvedAppOrderId, order, razorpay_payment_id, razorpay_order_id);
  if (orderResult.error) {
    console.error('Failed to mark order paid', orderResult.error);
    return json({ error: 'Failed to update order status' }, 500);
  }

  return json({ ok: true, appOrderId: resolvedAppOrderId });
});
