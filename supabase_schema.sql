-- The Alankar Supabase schema
-- Run first in the Supabase SQL editor.

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
    select 1 from public.admin_roles
    where user_id = auth.uid()
  );
$$;

create table if not exists public.profiles (
  id text primary key,
  user_id uuid unique references auth.users(id) on delete cascade,
  user_id_text text generated always as ((data->>'uid')) stored,
  email text generated always as ((data->>'email')) stored,
  referral_code text generated always as ((data->>'referralCode')) stored,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  sku text generated always as ((data->>'sku')) stored,
  category text generated always as ((data->>'category')) stored,
  brand text generated always as ((data->>'brand')) stored,
  active boolean generated always as (coalesce((data->>'active')::boolean, true)) stored,
  stock_quantity integer generated always as (nullif(data->>'stockQuantity', '')::integer) stored,
  price numeric(12,2) generated always as (nullif(data->>'price', '')::numeric) stored,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.brands (id text primary key, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.offers (id text primary key, code text generated always as (upper(data->>'code')) stored, active boolean generated always as (coalesce((data->>'active')::boolean, true)) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.main_banners (id text primary key, active boolean generated always as (coalesce((data->>'active')::boolean, true)) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.announcements (id text primary key, active boolean generated always as (coalesce((data->>'active')::boolean, true)) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.testing_videos (id text primary key, active boolean generated always as (coalesce((data->>'isActive')::boolean, true)) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.site_settings (id text primary key default 'storeSettings', data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.delivery_settings (id text primary key default 'default', data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

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
  updated_at timestamptz not null default now(),
  constraint orders_unique_order_id unique (order_id),
  constraint orders_unique_transaction unique (transaction_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'razorpay',
  provider_order_id text unique,
  provider_payment_id text unique,
  status text not null default 'created',
  amount_paise integer not null check (amount_paise >= 0),
  signature_verified boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (id text primary key, code text generated always as (upper(data->>'code')) stored, active boolean generated always as (coalesce((data->>'active')::boolean, true)) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.user_coupons (id text primary key, user_id text not null, coupon_id text generated always as ((data->>'couponId')) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.referrals (id text primary key, referrer_id text generated always as ((data->>'referrerId')) stored, referred_user_id text generated always as ((data->>'referredUserId')) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.wallet_transactions (id text primary key, user_id text generated always as ((data->>'userId')) stored, amount numeric(12,2) generated always as (nullif(data->>'amount', '')::numeric) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.app_ratings (id text primary key, user_id text generated always as ((data->>'userId')) stored, rating integer generated always as (nullif(data->>'rating', '')::integer) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.support_messages (id text primary key, email text generated always as ((data->>'email')) stored, status text generated always as ((data->>'status')) stored, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create index if not exists products_category_idx on public.products(category);
create index if not exists products_brand_idx on public.products(brand);
create index if not exists products_active_idx on public.products(active);
create index if not exists offers_code_idx on public.offers(code);
create index if not exists coupons_code_idx on public.coupons(code);
create index if not exists profiles_referral_code_idx on public.profiles(referral_code);
create index if not exists orders_user_id_text_idx on public.orders(user_id_text);
create index if not exists orders_order_id_idx on public.orders(order_id);
create index if not exists user_coupons_user_id_idx on public.user_coupons(user_id);
create index if not exists referrals_referrer_id_idx on public.referrals(referrer_id);
create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions(user_id);
create index if not exists app_ratings_user_id_idx on public.app_ratings(user_id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','products','categories','brands','offers','main_banners','announcements',
    'testing_videos','site_settings','delivery_settings','orders','payments','coupons',
    'user_coupons','referrals','wallet_transactions','app_ratings','support_messages'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
