-- Settings: โปรไฟล์ (display_name) + การตั้งค่าโปรเจกต์ (singleton) + กันแก้ role โดยไม่ใช่แอดมิน

alter table public.profiles
  add column if not exists display_name text;

-- ---------------------------------------------------------------------------
-- ป้องกันการเปลี่ยน role โดยผู้ใช้ทั่วไป (ยังให้แอดมินแก้ได้ + claim แอดมินคนแรกได้)
-- ---------------------------------------------------------------------------
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

  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) into actor_is_admin;

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

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row
  execute procedure public.profiles_guard_role_change();

-- ---------------------------------------------------------------------------
-- app_settings: แถวเดียว id = 'global'
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id text primary key default 'global',
  organization_name text not null default 'DINKR',
  organization_tagline text not null default '',
  report_footer_note text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id)
values ('global')
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "app_settings_update_admin" on public.app_settings;
create policy "app_settings_update_admin"
  on public.app_settings for update
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
