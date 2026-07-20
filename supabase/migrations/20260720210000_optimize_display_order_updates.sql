create or replace function public.admin_normalize_display_order(
  target_table text,
  active_id text,
  requested_order integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if target_table not in ('products', 'categories') then
    raise exception 'Unsupported table';
  end if;

  if requested_order is null or requested_order < 1 then
    return 0;
  end if;

  execute format(
    $query$
      with other_items as (
        select
          id,
          row_number() over (
            order by
              case
                when (data->>'displayOrder') ~ '^[0-9]+$'
                  and (data->>'displayOrder')::integer > 0
                then (data->>'displayOrder')::integer
                else 2147483647
              end,
              created_at,
              id
          )::integer as old_position
        from public.%I
        where id <> $1
          and (data->>'displayOrder') ~ '^[0-9]+$'
          and (data->>'displayOrder')::integer > 0
      ),
      item_count as (
        select count(*)::integer as other_count from other_items
      ),
      positions as (
        select
          id,
          old_position
            + case
                when old_position >= least($2, (select other_count + 1 from item_count))
                then 1
                else 0
              end as new_position
        from other_items

        union all

        select
          $1,
          least($2, other_count + 1)
        from item_count
        where exists (select 1 from public.%I where id = $1)
      )
      update public.%I as target
      set data = jsonb_set(
            coalesce(target.data, '{}'::jsonb),
            '{displayOrder}',
            to_jsonb(positions.new_position),
            true
          ) || jsonb_build_object('updatedAt', now()),
          updated_at = now()
      from positions
      where target.id = positions.id
        and coalesce(
          case
            when (target.data->>'displayOrder') ~ '^[0-9]+$'
            then (target.data->>'displayOrder')::integer
            else 0
          end,
          0
        ) <> positions.new_position
    $query$,
    target_table,
    target_table,
    target_table
  )
  using active_id, requested_order;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.admin_normalize_display_order(text, text, integer)
from public, anon;
grant execute on function public.admin_normalize_display_order(text, text, integer)
to authenticated, service_role;
