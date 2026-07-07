# Data Migration Guide

Production Firebase data was not included in this source copy and Firebase admin/export credentials were not provided. Therefore production data was not migrated.

## Export From Firebase

1. Export Firestore collections using the Firebase CLI or Google Cloud export.
2. Export Firebase Storage files for product images, banners, payment screenshots, profile images, and review images.
3. Export Firebase Auth users. Supabase Auth user passwords cannot be imported from Firebase password hashes without a planned auth migration flow.

## Import Order

1. Create Supabase schema: `supabase_schema.sql`.
2. Run RLS policies: `supabase_rls_policies.sql`.
3. Run storage setup: `supabase_storage_setup.sql`.
4. Create/import Supabase Auth users or invite users to reset passwords.
5. Import `profiles`.
6. Import storefront data: `categories`, `brands`, `products`, `offers`, `main_banners`, `announcements`, `testing_videos`, settings.
7. Import customer data: `user_coupons`, `referrals`, `wallet_transactions`, `app_ratings`, `support_messages`.
8. Import historical `orders` and `payments`.
9. Upload storage files and rewrite image URLs where needed.

## ID Strategy

- Existing Firestore document IDs are preserved as text primary keys.
- Firebase UID values are stored as text in compatibility fields.
- For future Supabase-native users, `auth.users.id` is used as the user ID.
- Historical orders preserve item snapshots in `orders.data.items`.

## Validation

- Count every Firebase collection and compare with Supabase row counts.
- Spot-check products, variants, stock, prices, images, orders, coupons, and profiles.
- Verify RLS as anonymous, customer, and admin.
- Verify no payment proof files are publicly readable.
