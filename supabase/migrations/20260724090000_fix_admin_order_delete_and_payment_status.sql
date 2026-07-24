drop policy if exists "admins delete orders" on public.orders;
create policy "admins delete orders"
on public.orders for delete
using (public.is_admin());

create or replace function public.sync_verified_order_from_captured_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'captured' and new.signature_verified then
    perform public.mark_order_paid(
      new.order_id,
      new.provider_payment_id,
      new.provider_order_id,
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_verified_order_from_captured_payment on public.payments;
create trigger sync_verified_order_from_captured_payment
after insert or update of status, signature_verified, provider_payment_id on public.payments
for each row
when (new.status = 'captured' and new.signature_verified)
execute function public.sync_verified_order_from_captured_payment();

do $$
declare
  payment_row public.payments%rowtype;
begin
  for payment_row in
    select *
    from public.payments
    where status = 'captured'
      and signature_verified
      and provider_payment_id is not null
  loop
    perform public.mark_order_paid(
      payment_row.order_id,
      payment_row.provider_payment_id,
      payment_row.provider_order_id,
      null
    );
  end loop;
end;
$$;
