import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('authorization') || '';
  const authClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401);

  const { appOrderId } = await req.json().catch(() => ({}));
  if (!appOrderId || typeof appOrderId !== 'string') return json({ error: 'Invalid order id' }, 400);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,data')
    .eq('id', appOrderId)
    .single();
  if (orderError || !order) {
    return json({ error: orderError?.message || 'Order not found' }, 404);
  }
  if (order.data?.userId && order.data.userId !== userData.user.id) return json({ error: 'Forbidden' }, 403);

  const amountPaise = Math.round(Number(order.data?.total || 0) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return json({ error: 'Invalid order amount' }, 400);

  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) return json({ error: 'Razorpay keys are not configured' }, 500);

  const { error: stockError } = await supabase.rpc('reserve_order_stock', {
    target_order_id: appOrderId,
  });
  if (stockError) {
    console.error('Failed to reserve order stock', stockError);
    const message = stockError.message?.includes('was not found')
      ? 'Some items in your cart are no longer available. Please refresh and add the current product again.'
      : stockError.message || 'Unable to reserve product stock';
    return json({ error: message }, 409);
  }

  const basic = btoa(`${keyId}:${keySecret}`);
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: appOrderId,
      notes: { app_order_id: appOrderId, user_id: userData.user.id },
    }),
  });
  const razorpayOrder = await response.json();
  if (!response.ok) {
    await supabase.rpc('release_order_stock', { target_order_id: appOrderId });
    return json({
      error: razorpayOrder?.error?.description || 'Payment order creation failed',
      code: razorpayOrder?.error?.code,
      reason: razorpayOrder?.error?.reason,
    }, 502);
  }

  const { error: paymentError } = await supabase.from('payments').upsert({
    order_id: appOrderId,
    user_id: userData.user.id,
    provider_order_id: razorpayOrder.id,
    status: 'created',
    amount_paise: amountPaise,
    raw_payload: razorpayOrder,
  }, { onConflict: 'provider_order_id' });
  if (paymentError) {
    console.error('Failed to save Razorpay order tracking record', paymentError);
    await supabase.rpc('release_order_stock', { target_order_id: appOrderId });
    return json({ error: 'Payment tracking could not be initialized' }, 500);
  }

  return json({
    appOrderId,
    razorpayOrderId: razorpayOrder.id,
    keyId,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  });
});
