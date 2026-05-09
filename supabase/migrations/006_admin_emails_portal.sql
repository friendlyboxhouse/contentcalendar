-- Portal admins (หลังบ้าน /admin) จากตาราง admin_emails — ไม่ใช้ profiles.role = 'admin'
--
-- Bootstrap (รันครั้งแรกใน Supabase SQL Editor ด้วย postgres):
--   insert into public.admin_emails (email) values ('you@company.com');
--   insert into public.allowed_emails (email) values ('you@company.com');
--
-- claim_first_admin() / has_any_admin() ใน migration 004 ยังอิ่ง profiles.role (legacy)
-- การเข้า /admin ในแอปใช้แค่ is_admin_email() = อีเมลอยู่ใน admin_emails

create table if not exists public.admin_emails (
  email text primary key
);

alter table public.admin_emails enable row level security;

create or replace function public.user_is_admin_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_emails e
    where lower(trim(e.email)) = lower(trim(auth.jwt() ->> 'email'))
  );
$$;

revoke all on function public.user_is_admin_portal() from public;
grant execute on function public.user_is_admin_portal() to authenticated;

create or replace function public.is_admin_email()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_is_admin_portal();
$$;

revoke all on function public.is_admin_email() from public;
grant execute on function public.is_admin_email() to authenticated;

drop policy if exists "admin_emails_portal_members_all" on public.admin_emails;
create policy "admin_emails_portal_members_all"
  on public.admin_emails
  for all
  to authenticated
  using (public.user_is_admin_portal())
  with check (public.user_is_admin_portal());

-- เดิมอิ่ง profiles.role = 'admin' — สลับเป็น admin_emails
drop policy if exists "allowed_emails_admin_all" on public.allowed_emails;
create policy "allowed_emails_admin_all"
  on public.allowed_emails
  for all
  to authenticated
  using (public.user_is_admin_portal())
  with check (public.user_is_admin_portal());

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
  on public.profiles
  for select
  to authenticated
  using (public.user_is_admin_portal());

drop policy if exists "profiles_admin_update_roles" on public.profiles;
create policy "profiles_admin_update_roles"
  on public.profiles
  for update
  to authenticated
  using (public.user_is_admin_portal())
  with check (public.user_is_admin_portal());

drop policy if exists "app_settings_update_admin" on public.app_settings;
create policy "app_settings_update_admin"
  on public.app_settings
  for update
  to authenticated
  using (public.user_is_admin_portal())
  with check (public.user_is_admin_portal());
