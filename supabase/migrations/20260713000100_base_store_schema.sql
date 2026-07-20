create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.main_banners (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testing_videos (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_coupons (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_ratings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_roles',
    'products',
    'categories',
    'brands',
    'offers',
    'main_banners',
    'announcements',
    'testing_videos',
    'site_settings',
    'delivery_settings',
    'profiles',
    'orders',
    'coupons',
    'user_coupons',
    'referrals',
    'wallet_transactions',
    'app_ratings',
    'support_messages'
  ]
  loop
    execute format('drop trigger if exists set_%1$s_updated_at on public.%1$I', table_name);
    execute format('create trigger set_%1$s_updated_at before update on public.%1$I for each row execute function public.set_updated_at()', table_name);
  end loop;
end $$;

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists user_coupons_user_id_idx on public.user_coupons(user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid()
  );
$$;

create or replace function public.admin_upsert_json_doc(target_table text, doc_id text, doc_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if target_table not in ('site_settings', 'delivery_settings') then
    raise exception 'Unsupported table';
  end if;

  execute format(
    'insert into public.%I (id, data, created_at, updated_at)
     values ($1, $2, now(), now())
     on conflict (id) do update set data = excluded.data, updated_at = now()',
    target_table
  )
  using doc_id, doc_data;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_roles',
    'products',
    'categories',
    'brands',
    'offers',
    'main_banners',
    'announcements',
    'testing_videos',
    'site_settings',
    'delivery_settings',
    'profiles',
    'orders',
    'coupons',
    'user_coupons',
    'referrals',
    'wallet_transactions',
    'app_ratings',
    'support_messages'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products',
    'categories',
    'brands',
    'offers',
    'main_banners',
    'announcements',
    'testing_videos',
    'site_settings',
    'delivery_settings'
  ]
  loop
    execute format('drop policy if exists "public read %1$s" on public.%1$I', table_name);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true)', table_name);
    execute format('drop policy if exists "admins manage %1$s" on public.%1$I', table_name);
    execute format('create policy "admins manage %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'coupons',
    'referrals',
    'wallet_transactions',
    'app_ratings',
    'support_messages'
  ]
  loop
    execute format('drop policy if exists "admins manage %1$s" on public.%1$I', table_name);
    execute format('create policy "admins manage %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', table_name);
  end loop;
end $$;

drop policy if exists "admins manage admin roles" on public.admin_roles;
create policy "admins manage admin roles"
on public.admin_roles for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users manage own profile" on public.profiles;
create policy "users manage own profile"
on public.profiles for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders"
on public.orders for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users create own orders" on public.orders;
create policy "users create own orders"
on public.orders for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "users update own orders" on public.orders;
create policy "users update own orders"
on public.orders for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "users manage own coupons" on public.user_coupons;
create policy "users manage own coupons"
on public.user_coupons for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.admin_upsert_json_doc(text, text, jsonb) to authenticated, service_role;

insert into storage.buckets (id, name, public)
values
  ('storefront-images', 'storefront-images', true),
  ('payment-proofs', 'payment-proofs', false),
  ('profile-images', 'profile-images', true),
  ('review-images', 'review-images', true)
on conflict (id) do nothing;

drop policy if exists "public read storefront images" on storage.objects;
create policy "public read storefront images"
on storage.objects for select
using (bucket_id in ('storefront-images', 'profile-images', 'review-images'));

drop policy if exists "admins manage storefront images" on storage.objects;
create policy "admins manage storefront images"
on storage.objects for all
using (bucket_id in ('storefront-images', 'profile-images', 'review-images') and public.is_admin())
with check (bucket_id in ('storefront-images', 'profile-images', 'review-images') and public.is_admin());

drop policy if exists "authenticated upload payment proofs" on storage.objects;
create policy "authenticated upload payment proofs"
on storage.objects for insert
with check (bucket_id = 'payment-proofs' and auth.uid() is not null);

drop policy if exists "users read payment proofs" on storage.objects;
create policy "users read payment proofs"
on storage.objects for select
using (bucket_id = 'payment-proofs' and (auth.uid() is not null or public.is_admin()));
