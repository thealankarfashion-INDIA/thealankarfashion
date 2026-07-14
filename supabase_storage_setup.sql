-- Run after supabase_schema.sql and supabase_rls_policies.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('storefront-images', 'storefront-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-images', 'profile-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('review-images', 'review-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read storefront images" on storage.objects;
create policy "public read storefront images"
on storage.objects for select
using (bucket_id in ('storefront-images', 'profile-images', 'review-images'));

drop policy if exists "admins manage storefront images" on storage.objects;
create policy "admins manage storefront images"
on storage.objects for all
to authenticated
using (bucket_id in ('storefront-images', 'profile-images', 'review-images') and public.is_admin())
with check (bucket_id in ('storefront-images', 'profile-images', 'review-images') and public.is_admin());

drop policy if exists "customers upload own payment proofs" on storage.objects;
create policy "customers upload own payment proofs"
on storage.objects for insert
with check (
  bucket_id = 'payment-proofs'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "customers read own payment proofs" on storage.objects;
create policy "customers read own payment proofs"
on storage.objects for select
using (
  bucket_id = 'payment-proofs'
  and auth.uid() is not null
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);
