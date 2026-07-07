# Firebase To Supabase Migration

## Source Status

Editable Vite + React + TypeScript source was present under `artifacts/eclat`. The outer folder and nested source folder did not contain a Git repository at the start of work.

## Feature Mapping

| Existing feature | Previous backend | Supabase replacement |
| --- | --- | --- |
| Customer auth | Firebase Auth | Supabase Auth in `src/context/AuthContext.tsx` |
| Google login | Firebase Google provider | Supabase OAuth Google provider |
| Admin auth | `VITE_ADMIN_PASSWORD` + `sessionStorage` | Supabase Auth plus `admin_roles` table and `public.is_admin()` |
| Products/categories/brands/offers/banners/videos | Firestore collections | Supabase PostgreSQL tables with `data jsonb` compatibility payloads |
| Store/delivery settings | Firestore `settings/*` docs | `site_settings` and `delivery_settings` |
| Orders/payments | Firestore `orders` | `orders` and `payments` tables |
| Ratings/referrals/wallet/support | Firestore collections/subcollections | Supabase tables |
| File uploads | Firebase Storage | Supabase Storage buckets |
| Realtime listeners | Firestore `onSnapshot` | Supabase Realtime wrapper where still needed |
| Razorpay | Browser-only verification | Supabase Edge Functions for create/verify/webhook |

## Firestore Collections Found

`products`, `offers`, `mainBanners`, `announcements`, `categories`, `brands`, `testingVideos`, `orders`, `users`, `users/{uid}/coupons`, `wallet_transactions`, `referrals`, `app_ratings`, `appRatings`, `supportMessages`, `coupons`, `settings/storeSettings`, `settings/deliverySettings`.

## Checklist

- [x] Add Supabase client.
- [x] Replace Firebase Auth with Supabase Auth.
- [x] Replace Firebase data imports with Supabase-backed data layer.
- [x] Replace Firebase Storage uploads with Supabase Storage wrapper.
- [x] Remove Firebase dependency and config file.
- [x] Remove browser admin password.
- [x] Add Supabase schema, RLS, storage SQL.
- [x] Add Razorpay Edge Function source.
- [ ] Run SQL in Supabase dashboard.
- [ ] Deploy Edge Functions after approval.
- [ ] Export and import production Firebase data.
- [ ] Configure Supabase Auth redirect URLs/providers.
