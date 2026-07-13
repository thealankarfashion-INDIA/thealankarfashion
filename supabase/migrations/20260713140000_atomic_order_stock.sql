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
        'reservationExpiresAt', now() + interval '5 minutes',
        'updatedAt', now()
      ),
      updated_at = now()
  where id = target_order_id;

  return true;
end;
$$;

create or replace function public.release_order_stock(target_order_id text)
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
  request_user_id uuid := auth.uid();
begin
  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    return false;
  end if;

  if auth.role() <> 'service_role'
     and (request_user_id is null or coalesce(order_row.user_id::text, order_row.data->>'userId', '') <> request_user_id::text) then
    raise exception 'Not authorized';
  end if;

  if coalesce(order_row.data->>'orderStatus', '') <> 'Payment Pending'
     or coalesce((order_row.data->>'stockRestored')::boolean, false) then
    return false;
  end if;

  if coalesce((order_row.data->>'stockDeducted')::boolean, false) then
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
  end if;

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
  where id = target_order_id;

  return true;
end;
$$;

create or replace function public.mark_order_paid(
  target_order_id text,
  provider_payment_id text,
  provider_order_id text,
  provider_payment_link_id text default null
)
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

  if not coalesce((order_row.data->>'stockDeducted')::boolean, false) then
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
      next_stock := greatest(0, current_stock - quantity);
      update public.products
      set data = coalesce(data, '{}'::jsonb) || jsonb_build_object(
            'stockQuantity', next_stock,
            'inStock', next_stock > 0,
            'updatedAt', now()
          ),
          updated_at = now()
      where id = product_id;
    end loop;
  end if;

  update public.orders
  set data = coalesce(data, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'transactionId', provider_payment_id,
        'razorpayPaymentId', provider_payment_id,
        'razorpayOrderId', provider_order_id,
        'razorpayPaymentLinkId', provider_payment_link_id,
        'paymentMethod', 'Razorpay',
        'paymentStatus', 'Paid',
        'orderStatus', 'Verified',
        'stockReserved', false,
        'stockDeducted', true,
        'stockCommitted', true,
        'stockRestored', false,
        'updatedAt', now()
      )),
      updated_at = now()
  where id = target_order_id;

  return true;
end;
$$;

revoke all on function public.reserve_order_stock(text) from public, anon, authenticated;
revoke all on function public.mark_order_paid(text, text, text, text) from public, anon, authenticated;
revoke all on function public.release_order_stock(text) from public, anon;

grant execute on function public.reserve_order_stock(text) to service_role;
grant execute on function public.mark_order_paid(text, text, text, text) to service_role;
grant execute on function public.release_order_stock(text) to authenticated, service_role;
