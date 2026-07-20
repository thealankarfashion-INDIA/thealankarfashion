create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'products', (select count(*) from public.products),
    'referrals', (select count(*) from public.referrals),
    'ratings', (
      select jsonb_build_object(
        'count', count(*),
        'avg', coalesce(round(avg((data->>'rating')::numeric), 1), 0)
      )
      from public.app_ratings
    ),
    'orders', (
      select jsonb_build_object(
        'totalCount', count(*),
        'paidCount', count(*) filter (where data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')),
        'totalRevenue', coalesce(sum((data->>'total')::numeric) filter (where data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')), 0),
        'thisMonthCount', count(*) filter (
          where data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')
            and created_at >= date_trunc('month', now())
        ),
        'thisMonthRevenue', coalesce(sum((data->>'total')::numeric) filter (
          where data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')
            and created_at >= date_trunc('month', now())
        ), 0),
        'lastMonthCount', count(*) filter (
          where data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')
            and created_at >= date_trunc('month', now()) - interval '1 month'
            and created_at < date_trunc('month', now())
        ),
        'lastMonthRevenue', coalesce(sum((data->>'total')::numeric) filter (
          where data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')
            and created_at >= date_trunc('month', now()) - interval '1 month'
            and created_at < date_trunc('month', now())
        ), 0),
        'statuses', jsonb_build_object(
          'pending', count(*) filter (where data->>'orderStatus' = 'Payment Pending'),
          'verifying', count(*) filter (where data->>'orderStatus' = 'Under Verification'),
          'processing', count(*) filter (where data->>'orderStatus' = 'Processing'),
          'shipped', count(*) filter (where data->>'orderStatus' = 'Shipped'),
          'delivered', count(*) filter (where data->>'orderStatus' = 'Delivered'),
          'cancelled', count(*) filter (where data->>'orderStatus' = 'Cancelled')
        )
      )
      from public.orders
    ),
    'lastSevenDays', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', days.day::date,
        'revenue', coalesce(stats.revenue, 0),
        'orders', coalesce(stats.orders, 0)
      ) order by days.day), '[]'::jsonb)
      from generate_series(
        date_trunc('day', now()) - interval '6 days',
        date_trunc('day', now()),
        interval '1 day'
      ) as days(day)
      left join lateral (
        select
          coalesce(sum((o.data->>'total')::numeric), 0) as revenue,
          count(*) as orders
        from public.orders o
        where o.data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')
          and o.created_at >= days.day
          and o.created_at < days.day + interval '1 day'
      ) stats on true
    ),
    'recentOrders', (
      select coalesce(jsonb_agg(row_to_json(recent) order by recent.created_at desc), '[]'::jsonb)
      from (
        select
          id,
          coalesce(data->>'orderId', id) as "orderId",
          coalesce(data->>'customerName', 'Unknown') as "customerName",
          coalesce((data->>'total')::numeric, 0) as total,
          coalesce(data->>'orderStatus', 'Pending') as status,
          created_at
        from public.orders
        where data->>'orderStatus' in ('Verified', 'Processing', 'Shipped', 'Delivered')
        order by created_at desc
        limit 5
      ) recent
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_summary() from public;
grant execute on function public.admin_dashboard_summary() to authenticated, service_role;
