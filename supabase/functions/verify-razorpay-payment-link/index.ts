import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { hmacSha256Hex, timingSafeEqual } from '../_shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => ({}));
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  } = body;

  if (![razorpay_payment_id, razorpay_payment_link_id, razorpay_payment_link_reference_id, razorpay_payment_link_status, razorpay_signature].every((v) => typeof v === 'string')) {
    return json({ error: 'Invalid payment payload' }, 400);
  }
  if (razorpay_payment_link_status !== 'paid') {
    return json({ error: 'Payment was not completed' }, 400);
  }

  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keySecret) return json({ error: 'Razorpay keys are not configured' }, 500);

  const payload = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
  const expected = await hmacSha256Hex(keySecret, payload);
  if (!timingSafeEqual(expected, razorpay_signature)) return json({ error: 'Invalid payment signature' }, 400);

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id,order_id,user_id,status')
    .eq('provider_order_id', razorpay_payment_link_id)
    .single();
  if (paymentError || !payment || payment.order_id !== razorpay_payment_link_reference_id) {
    return json({ error: 'Payment order mismatch' }, 403);
  }
  if (payment.status === 'captured') return json({ ok: true, duplicate: true, appOrderId: payment.order_id });

  const { data: order } = await supabase.from('orders').select('data').eq('id', payment.order_id).single();
  await supabase.from('payments').update({
    provider_payment_id: razorpay_payment_id,
    status: 'captured',
    signature_verified: true,
    raw_payload: body,
  }).eq('id', payment.id);
  await supabase.from('orders').update({
    data: {
      ...(order?.data || {}),
      transactionId: razorpay_payment_id,
      paymentMethod: 'Razorpay',
      orderStatus: 'Verified',
      updatedAt: new Date().toISOString(),
    },
  }).eq('id', payment.order_id);

  return json({ ok: true, appOrderId: payment.order_id });
});
