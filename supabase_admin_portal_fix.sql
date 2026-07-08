-- Thealankar admin portal repair script
-- Run this in Supabase SQL Editor if admin pages open but Orders, Invoices,
-- Store Settings, or Delivery Charges cannot read/save data.

create extension if not exists pgcrypto;

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles
    where user_id = auth.uid()
  );
$$;

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- Make the current store email an admin. Change the email if you use another admin account.
insert into public.admin_roles (user_id)
select id
from auth.users
where lower(email) = lower('thealankar.fashion@gmail.com')
on conflict (user_id) do nothing;

-- Core tables used by the admin portal. Existing tables/data are not deleted.
create table if not exists public.site_settings (
  id text primary key default 'storeSettings',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_settings (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  user_id_text text generated always as ((data->>'userId')) stored,
  order_id text generated always as ((data->>'orderId')) stored,
  transaction_id text generated always as ((data->>'transactionId')) stored,
  status text generated always as ((data->>'orderStatus')) stored,
  payment_method text generated always as ((data->>'paymentMethod')) stored,
  total numeric(12,2) generated always as (nullif(data->>'total', '')::numeric) stored,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.categories (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.brands (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.offers (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.main_banners (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.announcements (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.testing_videos (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.coupons (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.user_coupons (id text primary key, user_id text, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.referrals (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.wallet_transactions (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.app_ratings (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.support_messages (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

do $$
declare
  t text;
begin
  foreach t in array array[
    'products','categories','brands','offers','main_banners','announcements',
    'testing_videos','site_settings','delivery_settings','orders','coupons',
    'user_coupons','referrals','wallet_transactions','app_ratings','support_messages'
  ]
  loop
    execute format('alter table public.%I add column if not exists data jsonb not null default ''{}''::jsonb', t);
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', t);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
  end loop;
end $$;

alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists user_id_text text generated always as ((data->>'userId')) stored;
alter table public.user_coupons add column if not exists user_id text;

grant select on public.products, public.categories, public.brands, public.offers,
  public.main_banners, public.announcements, public.testing_videos,
  public.site_settings, public.delivery_settings, public.app_ratings
to anon, authenticated;

grant all on public.admin_roles, public.products, public.categories, public.brands,
  public.offers, public.main_banners, public.announcements, public.testing_videos,
  public.site_settings, public.delivery_settings, public.orders, public.coupons,
  public.user_coupons, public.referrals, public.wallet_transactions,
  public.app_ratings, public.support_messages
to authenticated;

alter table public.admin_roles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.offers enable row level security;
alter table public.main_banners enable row level security;
alter table public.announcements enable row level security;
alter table public.testing_videos enable row level security;
alter table public.site_settings enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.orders enable row level security;
alter table public.coupons enable row level security;
alter table public.user_coupons enable row level security;
alter table public.referrals enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.app_ratings enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "admins read roles" on public.admin_roles;
create policy "admins read roles" on public.admin_roles
for select using (public.is_admin());

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products
for select using (true);

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
for select using (true);

drop policy if exists "public read brands" on public.brands;
create policy "public read brands" on public.brands
for select using (true);

drop policy if exists "public read offers" on public.offers;
create policy "public read offers" on public.offers
for select using (true);

drop policy if exists "public read banners" on public.main_banners;
create policy "public read banners" on public.main_banners
for select using (true);

drop policy if exists "public read announcements" on public.announcements;
create policy "public read announcements" on public.announcements
for select using (true);

drop policy if exists "public read videos" on public.testing_videos;
create policy "public read videos" on public.testing_videos
for select using (true);

drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings
for select using (true);

drop policy if exists "public read delivery settings" on public.delivery_settings;
create policy "public read delivery settings" on public.delivery_settings
for select using (true);

drop policy if exists "public read ratings" on public.app_ratings;
create policy "public read ratings" on public.app_ratings
for select using (true);

drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders
for select using (user_id_text = auth.uid()::text or user_id = auth.uid());

drop policy if exists "customers create own orders" on public.orders;
create policy "customers create own orders" on public.orders
for insert with check (user_id_text = auth.uid()::text or user_id = auth.uid());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage brands" on public.brands;
create policy "admins manage brands" on public.brands for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage offers" on public.offers;
create policy "admins manage offers" on public.offers for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage banners" on public.main_banners;
create policy "admins manage banners" on public.main_banners for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage videos" on public.testing_videos;
create policy "admins manage videos" on public.testing_videos for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage settings" on public.site_settings;
create policy "admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage delivery" on public.delivery_settings;
create policy "admins manage delivery" on public.delivery_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage coupons" on public.coupons;
create policy "admins manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage user coupons" on public.user_coupons;
create policy "admins manage user coupons" on public.user_coupons for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage referrals" on public.referrals;
create policy "admins manage referrals" on public.referrals for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage wallet" on public.wallet_transactions;
create policy "admins manage wallet" on public.wallet_transactions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage ratings" on public.app_ratings;
create policy "admins manage ratings" on public.app_ratings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage support" on public.support_messages;
create policy "admins manage support" on public.support_messages for all using (public.is_admin()) with check (public.is_admin());
