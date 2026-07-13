create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
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

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

drop policy if exists "customers read own payments" on public.payments;
create policy "customers read own payments"
on public.payments for select
using (user_id = auth.uid());

drop policy if exists "admins manage payments" on public.payments;
create policy "admins manage payments"
on public.payments for all
using (public.is_admin())
with check (public.is_admin());

grant select on public.payments to authenticated;
grant all on public.payments to service_role;
