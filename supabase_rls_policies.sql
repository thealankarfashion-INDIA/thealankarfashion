-- Run after supabase_schema.sql.

alter table public.admin_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.offers enable row level security;
alter table public.main_banners enable row level security;
alter table public.announcements enable row level security;
alter table public.testing_videos enable row level security;
alter table public.site_settings enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.coupons enable row level security;
alter table public.user_coupons enable row level security;
alter table public.referrals enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.app_ratings enable row level security;
alter table public.support_messages enable row level security;

create policy "admins read roles" on public.admin_roles for select using (public.is_admin());

create policy "public read active products" on public.products for select using (active is true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read brands" on public.brands for select using (true);
create policy "public read active offers" on public.offers for select using (active is true);
create policy "public read active banners" on public.main_banners for select using (active is true);
create policy "public read active announcements" on public.announcements for select using (active is true);
create policy "public read active videos" on public.testing_videos for select using (active is true);
create policy "public read site settings" on public.site_settings for select using (true);
create policy "public read delivery settings" on public.delivery_settings for select using (true);

create policy "customers read own profile" on public.profiles for select using (id = auth.uid()::text or user_id = auth.uid());
create policy "customers upsert own profile" on public.profiles for insert with check (id = auth.uid()::text or user_id = auth.uid());
create policy "customers update own profile" on public.profiles for update using (id = auth.uid()::text or user_id = auth.uid()) with check (id = auth.uid()::text or user_id = auth.uid());

create policy "customers read own orders" on public.orders for select using (user_id_text = auth.uid()::text or user_id = auth.uid());
create policy "customers create own orders" on public.orders for insert with check (user_id_text = auth.uid()::text or user_id = auth.uid());
create policy "customers read own payments" on public.payments for select using (user_id = auth.uid());
create policy "customers read own coupons" on public.user_coupons for select using (user_id = auth.uid()::text);
create policy "customers manage own coupons" on public.user_coupons for update using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy "customers read own referrals" on public.referrals for select using (referrer_id = auth.uid()::text or referred_user_id = auth.uid()::text);
create policy "customers read own wallet" on public.wallet_transactions for select using (user_id = auth.uid()::text);
create policy "customers rate once managed by app" on public.app_ratings for insert with check (user_id is null or user_id = auth.uid()::text);
create policy "customers read ratings" on public.app_ratings for select using (true);
create policy "customers submit support" on public.support_messages for insert with check (true);

create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage brands" on public.brands for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage offers" on public.offers for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage banners" on public.main_banners for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage videos" on public.testing_videos for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage delivery" on public.delivery_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage user coupons" on public.user_coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage referrals" on public.referrals for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage wallet" on public.wallet_transactions for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage ratings" on public.app_ratings for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage support" on public.support_messages for all using (public.is_admin()) with check (public.is_admin());
