import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { corsHeaders, json } from '../_shared/cors.ts';

const ALLOWED_CALLBACK_ORIGINS = new Set([
  'https://thealankarfashion-india.github.io',
  'https://thealankar.in',
]);

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

  const { appOrderId, callbackUrl } = await req.json().catch(() => ({}));
  if (!appOrderId || typeof appOrderId !== 'string') return json({ error: 'Invalid order id' }, 400);
  if (!callbackUrl || typeof callbackUrl !== 'string') return json({ error: 'Invalid callback URL' }, 400);

  let parsedCallback: URL;
  try {
    parsedCallback = new URL(callbackUrl);
  } catch {
    return json({ error: 'Invalid callback URL' }, 400);
  }
  if (!ALLOWED_CALLBACK_ORIGINS.has(parsedCallback.origin)) {
    return json({ error: 'Callback URL is not allowed' }, 400);
  }

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

  const customerName = String(order.data?.customerName || 'The Alankar Customer').trim();
  const email = String(order.data?.email || '').trim();
  const contact = String(order.data?.phone || '').replace(/\D/g, '');
  const customer: Record<string, string> = { name: customerName };
  if (email) customer.email = email;
  if (contact.length >= 10) customer.contact = contact.slice(-10);

  const basic = btoa(`${keyId}:${keySecret}`);
  const response = await fetch('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      accept_partial: false,
      reference_id: appOrderId,
      description: `The Alankar order ${appOrderId}`,
      customer,
      notify: { sms: false, email: false },
      reminder_enable: false,
      callback_url: callbackUrl,
      callback_method: 'get',
      expire_by: Math.floor(Date.now() / 1000) + 5 * 60,
      notes: { app_order_id: appOrderId, user_id: userData.user.id },
    }),
  });
  const paymentLink = await response.json();
  if (!response.ok) {
    return json({
      error: paymentLink?.error?.description || 'Payment link creation failed',
      code: paymentLink?.error?.code,
      reason: paymentLink?.error?.reason,
    }, 502);
  }

  await supabase.from('payments').upsert({
    order_id: appOrderId,
    user_id: userData.user.id,
    provider_order_id: paymentLink.id,
    status: 'created',
    amount_paise: amountPaise,
    raw_payload: paymentLink,
  }, { onConflict: 'provider_order_id' });

  return json({
    appOrderId,
    paymentLinkId: paymentLink.id,
    shortUrl: paymentLink.short_url,
    amount: paymentLink.amount,
    currency: paymentLink.currency,
  });
});
