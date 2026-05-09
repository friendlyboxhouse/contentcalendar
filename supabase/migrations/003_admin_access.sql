-- ให้ profiles.role = 'admin' จัดการ allowed_emails และดู/แก้ role ของผู้ใช้คนอื่น
-- ตั้งแอดมินคนแรกใน SQL Editor:
-- update public.profiles set role = 'admin' where lower(trim(email)) = 'you@example.com';

drop policy if exists "allowed_emails_admin_all" on public.allowed_emails;
create policy "allowed_emails_admin_all"
  on public.allowed_emails
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "profiles_admin_update_roles" on public.profiles;
create policy "profiles_admin_update_roles"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
