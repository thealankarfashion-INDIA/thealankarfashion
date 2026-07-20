create or replace function public.set_order_user_id_from_auth()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if new.user_id is null then
    new.user_id := current_user_id;
  elsif new.user_id <> current_user_id and not public.is_admin() then
    raise exception 'Order user does not match the authenticated user'
      using errcode = '42501';
  end if;

  new.data := jsonb_set(
    coalesce(new.data, '{}'::jsonb),
    '{userId}',
    to_jsonb(new.user_id::text),
    true
  );
  return new;
end;
$$;

drop trigger if exists set_order_user_id_from_auth on public.orders;
create trigger set_order_user_id_from_auth
before insert on public.orders
for each row
execute function public.set_order_user_id_from_auth();
