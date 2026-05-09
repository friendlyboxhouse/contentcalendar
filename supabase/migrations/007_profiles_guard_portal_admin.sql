-- ให้ผู้ที่อยู่ใน admin_emails แก้ role ของผู้อื่นได้ (เทียบเท่าแอดมินในระบบเก่าที่ใช้ profiles.role)
create or replace function public.profiles_guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
  any_admin_exists boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.role is not distinct from old.role then
    return new;
  end if;

  select public.user_is_admin_portal() into actor_is_admin;

  if actor_is_admin then
    return new;
  end if;

  select exists (
    select 1 from public.profiles where role = 'admin'
  ) into any_admin_exists;

  if not any_admin_exists and new.role = 'admin' and old.id = auth.uid() then
    return new;
  end if;

  raise exception 'Changing role is restricted to administrators';
end;
$$;
