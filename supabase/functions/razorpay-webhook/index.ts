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
  const { data: record } = await supabase.from('payments').select('id,order_id').eq('provider_order_id', orderId).single();
  if (!record) return json({ ok: true, ignored: true });

  const status = event.event === 'payment.captured' ? 'captured' : event.event === 'payment.failed' ? 'failed' : payment.status;
  await supabase.from('payments').update({
    provider_payment_id: payment.id,
    status,
    raw_payload: event,
  }).eq('id', record.id);

  if (status === 'captured') {
    const { data: order } = await supabase.from('orders').select('data').eq('id', record.order_id).single();
    await supabase.from('orders').update({
      data: {
        ...(order?.data || {}),
        transactionId: payment.id,
        paymentMethod: 'Razorpay',
        orderStatus: 'Verified',
        updatedAt: new Date().toISOString(),
      },
    }).eq('id', record.order_id);
  }

  return json({ ok: true });
});
