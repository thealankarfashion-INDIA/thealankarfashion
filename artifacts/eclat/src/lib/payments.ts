import { supabase } from './supabase';

export async function createRazorpayOrder(appOrderId: string) {
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { appOrderId },
  });
  if (error) throw new Error(error.message || 'Unable to create payment order.');
  return data as { razorpayOrderId: string; amount: number; currency: string; appOrderId: string };
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
  if (error) throw new Error(error.message || 'Payment verification failed.');
  return data as { ok: boolean };
}
