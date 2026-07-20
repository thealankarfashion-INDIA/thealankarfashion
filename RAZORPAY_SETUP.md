# Razorpay Setup

## Edge Function Secrets

Set these in Supabase, not in Vite:

```bash
supabase secrets set RAZORPAY_KEY_ID=...
supabase secrets set RAZORPAY_KEY_SECRET=...
supabase secrets set RAZORPAY_WEBHOOK_SECRET=...
supabase secrets set SUPABASE_URL=https://opaszigtibugtrxfsufn.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

## Functions

Source code is present but not deployed:

- `supabase/functions/create-razorpay-order`
- `supabase/functions/create-razorpay-payment-link`
- `supabase/functions/verify-razorpay-payment`
- `supabase/functions/verify-razorpay-payment-link`
- `supabase/functions/razorpay-webhook`

Deploy later only after approval:

```bash
supabase functions deploy create-razorpay-order
supabase functions deploy create-razorpay-payment-link
supabase functions deploy verify-razorpay-payment
supabase functions deploy verify-razorpay-payment-link
supabase functions deploy razorpay-webhook
```

## Webhook

Webhook URL format:

`https://opaszigtibugtrxfsufn.supabase.co/functions/v1/razorpay-webhook`

Enable at least:

- `payment.captured`
- `payment.failed`

The webhook function verifies `x-razorpay-signature`.

## Security Notes

- Browser code uses only `VITE_RAZORPAY_KEY_ID`.
- Browser no longer marks Razorpay payments verified by itself.
- `verify-razorpay-payment` verifies the Razorpay signature server-side.
- Webhook processing is idempotent for already-captured payments.
- Existing manual UPI remains an admin-verification flow.
