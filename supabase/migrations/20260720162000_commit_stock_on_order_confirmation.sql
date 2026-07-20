create or replace function public.commit_stock_on_order_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  product_id text;
  quantity integer;
  current_stock integer;
  next_stock integer;
  next_status text := coalesce(new.data->>'orderStatus', '');
begin
  if next_status not in ('Verified', 'Processing', 'Shipped', 'Delivered')
     or coalesce((new.data->>'stockDeducted')::boolean, false) then
    return new;
  end if;

  for item in
    select value
    from jsonb_array_elements(coalesce(new.data->'items', '[]'::jsonb))
  loop
    product_id := nullif(item->>'id', '');
    quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));

    if product_id is null then
      continue;
    end if;

    select *
    into product_row
    from public.products
    where id = product_id
    for update;

    if not found then
      raise exception 'Product % was not found', product_id;
    end if;

    current_stock := greatest(
      0,
      coalesce((product_row.data->>'stockQuantity')::integer, 0)
    );

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

  new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object(
    'stockReserved', false,
    'stockDeducted', true,
    'stockCommitted', true,
    'stockRestored', false,
    'stockCommittedAt', now(),
    'updatedAt', now()
  );
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists commit_stock_on_order_confirmation on public.orders;

create trigger commit_stock_on_order_confirmation
before insert or update of data on public.orders
for each row
execute function public.commit_stock_on_order_confirmation();
