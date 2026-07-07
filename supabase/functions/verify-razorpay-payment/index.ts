import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { hmacSha256Hex, timingSafeEqual } from '../_shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('authorization') || '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401);

  const body = await req.json().catch(() => ({}));
  const { appOrderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
  if (![appOrderId, razorpay_payment_id, razorpay_order_id, razorpay_signature].every((v) => typeof v === 'string')) {
    return json({ error: 'Invalid payment payload' }, 400);
  }

  const expected = await hmacSha256Hex(Deno.env.get('RAZORPAY_KEY_SECRET')!, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (!timingSafeEqual(expected, razorpay_signature)) return json({ error: 'Invalid payment signature' }, 400);

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id,order_id,user_id,status')
    .eq('provider_order_id', razorpay_order_id)
    .single();
  if (paymentError || !payment || payment.order_id !== appOrderId || payment.user_id !== userData.user.id) {
    return json({ error: 'Payment order mismatch' }, 403);
  }
  if (payment.status === 'captured') return json({ ok: true, duplicate: true });

  const { data: order } = await supabase.from('orders').select('data').eq('id', appOrderId).single();
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
  }).eq('id', appOrderId);

  return json({ ok: true });
});
