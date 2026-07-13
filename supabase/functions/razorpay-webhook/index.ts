import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { hmacSha256Hex, timingSafeEqual } from '../_shared/crypto.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  const expected = await hmacSha256Hex(Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!, rawBody);
  if (!timingSafeEqual(expected, signature)) return json({ error: 'Invalid webhook signature' }, 400);

  const event = JSON.parse(rawBody);
  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  if (!orderId) return json({ ok: true, ignored: true });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: record, error: recordError } = await supabase
    .from('payments')
    .select('id,order_id')
    .eq('provider_order_id', orderId)
    .single();
  if (recordError) console.error('Razorpay webhook payment lookup failed', recordError);
  if (!record) return json({ ok: true, ignored: true });

  const status = event.event === 'payment.captured' ? 'captured' : event.event === 'payment.failed' ? 'failed' : payment.status;
  const { error: paymentError } = await supabase.from('payments').update({
    provider_payment_id: payment.id,
    status,
    signature_verified: status === 'captured',
    raw_payload: event,
  }).eq('id', record.id);
  if (paymentError) {
    console.error('Razorpay webhook payment update failed', paymentError);
    return json({ error: 'Payment update failed' }, 500);
  }

  if (status === 'captured') {
    const { error: orderUpdateError } = await supabase.rpc('mark_order_paid', {
      target_order_id: record.order_id,
      provider_payment_id: payment.id,
      provider_order_id: orderId,
      provider_payment_link_id: null,
    });
    if (orderUpdateError) {
      console.error('Razorpay webhook order update failed', orderUpdateError);
      return json({ error: 'Order update failed' }, 500);
    }
  }

  return json({ ok: true });
});
