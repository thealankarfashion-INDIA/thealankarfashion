create or replace function public.reserve_order_stock(target_order_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  product_row public.products%rowtype;
  item jsonb;
  product_id text;
  quantity integer;
  current_stock integer;
  next_stock integer;
begin
  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if coalesce((order_row.data->>'stockDeducted')::boolean, false) then
    return true;
  end if;

  if coalesce(order_row.data->>'orderStatus', '') <> 'Payment Pending' then
    raise exception 'Order is not awaiting payment';
  end if;

  for item in select value from jsonb_array_elements(coalesce(order_row.data->'items', '[]'::jsonb))
  loop
    product_id := nullif(item->>'id', '');
    quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));
    if product_id is null then
      continue;
    end if;

    select * into product_row
    from public.products
    where id = product_id
    for update;

    if not found then
      raise exception 'Product % was not found', product_id;
    end if;

    current_stock := greatest(0, coalesce((product_row.data->>'stockQuantity')::integer, 0));
    if current_stock < quantity then
      raise exception 'Insufficient stock for %', coalesce(item->>'name', product_id);
    end if;

    next_stock := current_stock - quantity;
    update public.products
    set data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
          'stockQuantity', next_stock,
          'inStock', next_stock > 0,
          'updatedAt', now()
        ),
        updated_at = now()
    where id = product_id;
  end loop;

  update public.orders
  set data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
        'stockReserved', true,
        'stockDeducted', true,
        'stockCommitted', false,
        'stockRestored', false,
        'reservationExpiresAt', now() + interval '15 minutes',
        'updatedAt', now()
      ),
      updated_at = now()
  where id = target_order_id;

  return true;
end;
$$;

create or replace function public.release_expired_order_stock()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  product_row public.products%rowtype;
  item jsonb;
  product_id text;
  quantity integer;
  current_stock integer;
  restored_count integer := 0;
  request_user_id uuid := auth.uid();
begin
  for order_row in
    select *
    from public.orders
    where data->>'orderStatus' = 'Payment Pending'
      and coalesce((data->>'stockDeducted')::boolean, false)
      and not coalesce((data->>'stockRestored')::boolean, false)
      and nullif(data->>'reservationExpiresAt', '') is not null
      and (data->>'reservationExpiresAt')::timestamptz <= now()
      and (
        request_user_id is null
        or coalesce(user_id::text, data->>'userId', '') = request_user_id::text
      )
    for update skip locked
  loop
    for item in select value from jsonb_array_elements(coalesce(order_row.data->'items', '[]'::jsonb))
    loop
      product_id := nullif(item->>'id', '');
      quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));
      if product_id is null then
        continue;
      end if;

      select * into product_row
      from public.products
      where id = product_id
      for update;

      if found then
        current_stock := greatest(0, coalesce((product_row.data->>'stockQuantity')::integer, 0));
        update public.products
        set data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
              'stockQuantity', current_stock + quantity,
              'inStock', true,
              'updatedAt', now()
            ),
            updated_at = now()
        where id = product_id;
      end if;
    end loop;

    update public.orders
    set data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
          'orderStatus', 'Cancelled',
          'stockReserved', false,
          'stockDeducted', false,
          'stockCommitted', false,
          'stockRestored', true,
          'stockRestoredAt', now(),
          'updatedAt', now()
        ),
        updated_at = now()
    where id = order_row.id;

    restored_count := restored_count + 1;
  end loop;

  return restored_count;
end;
$$;

revoke all on function public.release_expired_order_stock() from public, anon;
grant execute on function public.release_expired_order_stock() to authenticated, service_role;

create extension if not exists pg_cron with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'release-expired-order-stock'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'release-expired-order-stock',
    '* * * * *',
    'select public.release_expired_order_stock();'
  );
end;
$$;
