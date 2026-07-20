do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products',
    'offers',
    'site_settings',
    'delivery_settings',
    'orders',
    'coupons',
    'user_coupons',
    'profiles',
    'referrals',
    'wallet_transactions',
    'app_ratings',
    'support_messages'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
       ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end
$$;
