# Supabase Setup

## SQL Order

Run in this order:

1. `supabase_schema.sql`
2. `supabase_rls_policies.sql`
3. `supabase_storage_setup.sql`

## Auth Settings

- Site URL: set to the eventual production site URL.
- Local redirect URL for testing: `http://localhost:5173/**`
- Production redirect URL: add the final deployed domain when deployment is approved.
- Enable Google provider only if Google login should remain active.

## First Admin

1. Create a Supabase Auth user for the admin email.
2. Insert the admin role from SQL editor:

```sql
insert into public.admin_roles (user_id)
values ('AUTH_USER_UUID_HERE');
```

Do not expose or use a frontend admin password.

## Storage

Run `supabase_storage_setup.sql`. Public buckets are for storefront/profile/review images. `payment-proofs` is private.

## Edge Function Secrets

See `RAZORPAY_SETUP.md`.

## Verification

- Anonymous user can read public products, categories, banners, announcements, and videos.
- Anonymous user cannot read orders, profiles, payments, payment proofs, or admin data.
- Customer can read/update only their own profile and own orders.
- Admin account with `admin_roles` row can manage catalog and orders.
- Confirm browser bundle does not contain `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secret, or webhook secret.
