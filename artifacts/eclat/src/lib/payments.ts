import { supabase } from './supabase';

export async function createRazorpayOrder(appOrderId: string) {
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { appOrderId },
  });
  if (error) {
    const response = (error as any).context;
    const details = response instanceof Response ? await response.json().catch(() => null) : null;
    throw new Error(details?.error || error.message || 'Unable to create payment order.');
  }
  return data as { razorpayOrderId: string; keyId?: string; amount: number; currency: string; appOrderId: string };
}

export async function createRazorpayPaymentLink(appOrderId: string, callbackUrl: string) {
  const { data, error } = await supabase.functions.invoke('create-razorpay-payment-link', {
    body: { appOrderId, callbackUrl },
  });
  if (error) {
    const response = (error as any).context;
    const details = response instanceof Response ? await response.json().catch(() => null) : null;
    throw new Error(details?.error || error.message || 'Unable to create payment link.');
  }
  return data as { paymentLinkId: string; shortUrl: string; amount: number; currency: string; appOrderId: string };
}

export async function verifyRazorpayPayment(payload: {
  appOrderId: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: payload,
  });
  if (error) {
    const response = (error as any).context;
    const details = response instanceof Response ? await response.json().catch(() => null) : null;
    throw new Error(details?.error || error.message || 'Payment verification failed.');
  }
  return data as { ok: boolean };
}

export async function verifyRazorpayPaymentLink(payload: {
  razorpay_payment_id: string;
  razorpay_payment_link_id: string;
  razorpay_payment_link_reference_id: string;
  razorpay_payment_link_status: string;
  razorpay_signature: string;
}) {
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment-link', {
    body: payload,
  });
  if (error) {
    const response = (error as any).context;
    const details = response instanceof Response ? await response.json().catch(() => null) : null;
    throw new Error(details?.error || error.message || 'Payment verification failed.');
  }
  return data as { ok: boolean; appOrderId: string };
}
