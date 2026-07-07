-- Run after supabase_schema.sql and supabase_rls_policies.sql.

insert into storage.buckets (id, name, public)
values
  ('storefront-images', 'storefront-images', true),
  ('payment-proofs', 'payment-proofs', false),
  ('profile-images', 'profile-images', true),
  ('review-images', 'review-images', true)
on conflict (id) do nothing;

create policy "public read storefront images"
on storage.objects for select
using (bucket_id in ('storefront-images', 'profile-images', 'review-images'));

create policy "admins manage storefront images"
on storage.objects for all
using (bucket_id in ('storefront-images', 'profile-images', 'review-images') and public.is_admin())
with check (bucket_id in ('storefront-images', 'profile-images', 'review-images') and public.is_admin());

create policy "customers upload own payment proofs"
on storage.objects for insert
with check (
  bucket_id = 'payment-proofs'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "customers read own payment proofs"
on storage.objects for select
using (
  bucket_id = 'payment-proofs'
  and auth.uid() is not null
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
