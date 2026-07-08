import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('authorization') || '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401);

  const { appOrderId } = await req.json().catch(() => ({}));
  if (!appOrderId || typeof appOrderId !== 'string') return json({ error: 'Invalid order id' }, 400);

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,user_id_text,data,total')
    .eq('id', appOrderId)
    .single();
  if (orderError || !order) return json({ error: 'Order not found' }, 404);
  if (order.user_id_text && order.user_id_text !== userData.user.id) return json({ error: 'Forbidden' }, 403);

  const amountPaise = Math.round(Number(order.total || order.data?.total || 0) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return json({ error: 'Invalid order amount' }, 400);

  const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
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
  if (!response.ok) return json({ error: 'Payment order creation failed' }, 502);

  await supabase.from('payments').upsert({
    order_id: appOrderId,
    user_id: userData.user.id,
    provider_order_id: razorpayOrder.id,
    status: 'created',
    amount_paise: amountPaise,
    raw_payload: razorpayOrder,
  }, { onConflict: 'provider_order_id' });

  return json({
    appOrderId,
    razorpayOrderId: razorpayOrder.id,
    keyId,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  });
});
