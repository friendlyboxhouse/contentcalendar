-- ============================================================================
-- 008_workspaces.sql — Multi-tenant workspaces + team RLS on content_items
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. workspaces / workspace_members
-- -----------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('viewer', 'editor', 'admin')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

create index if not exists workspace_members_workspace_idx
  on public.workspace_members (workspace_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (
    id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin"
  on public.workspaces for update
  to authenticated
  using (
    id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  )
  with check (
    id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "workspaces_insert_self" on public.workspaces;
create policy "workspaces_insert_self"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
  on public.workspace_members for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
create policy "workspace_members_insert_admin"
  on public.workspace_members for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "workspace_members_insert_self_creator" on public.workspace_members;
create policy "workspace_members_insert_self_creator"
  on public.workspace_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id
        and w.created_by = auth.uid()
        and user_id = auth.uid()
    )
  );

drop policy if exists "workspace_members_update_admin" on public.workspace_members;
create policy "workspace_members_update_admin"
  on public.workspace_members for update
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  )
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "workspace_members_delete_admin_or_self" on public.workspace_members;
create policy "workspace_members_delete_admin_or_self"
  on public.workspace_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 2. SECURITY DEFINER — bootstrap personal workspace (ข้าม RLS)
-- -----------------------------------------------------------------------------
create or replace function public.ensure_personal_workspace_for_user(target_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws uuid;
begin
  select wm.workspace_id into ws
  from public.workspace_members wm
  where wm.user_id = target_user
  order by wm.joined_at asc
  limit 1;

  if ws is not null then
    return ws;
  end if;

  insert into public.workspaces (name, created_by, slug)
  values ('Personal workspace', target_user, 'personal-' || target_user::text)
  returning id into ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws, target_user, 'admin');

  return ws;
end;
$$;

create or replace function public.trg_profiles_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_personal_workspace_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_personal_workspace on public.profiles;
create trigger profiles_personal_workspace
  after insert on public.profiles
  for each row
  execute procedure public.trg_profiles_personal_workspace();

-- -----------------------------------------------------------------------------
-- 3. profiles — ให้สมาชิก workspace เดียวกันมองเห็นอีเมล/ชื่อ (สำหรับ Owner picklist)
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select_workspace_peer" on public.profiles;
create policy "profiles_select_workspace_peer"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_members wm1
      join public.workspace_members wm2
        on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid()
        and wm2.user_id = public.profiles.id
    )
  );

-- -----------------------------------------------------------------------------
-- 4. RPC — เชิญสมาชิกด้วยอีเมล (ผู้ใช้ต้องมีแถว profiles แล้วจากการล็อกอิน)
-- -----------------------------------------------------------------------------
create or replace function public.invite_to_workspace(
  p_workspace uuid,
  p_email text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  ) then
    raise exception 'workspace invite denied';
  end if;

  if p_role not in ('viewer', 'editor', 'admin') then
    raise exception 'invalid role';
  end if;

  select p.id into uid
  from public.profiles p
  where lower(trim(p.email)) = lower(trim(p_email))
  limit 1;

  if uid is null then
    raise exception 'email_not_registered';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (p_workspace, uid, p_role, auth.uid())
  on conflict (workspace_id, user_id) do update
    set role = excluded.role,
        invited_by = excluded.invited_by;
end;
$$;

grant execute on function public.invite_to_workspace(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. content_items — เพิ่ม workspace_id + backfill + RLS แบบทีม
-- -----------------------------------------------------------------------------
alter table public.content_items
  add column if not exists workspace_id uuid references public.workspaces (id);

create index if not exists content_items_workspace_id_idx
  on public.content_items (workspace_id);

-- Backfill workspace + membership สำหรับผู้ใช้ที่มี profiles แต่ยังไม่มีทีม
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    perform public.ensure_personal_workspace_for_user(r.id);
  end loop;
end $$;

-- ผูกแถว content เดิมเข้ากับ workspace ส่วนตัวของเจ้าของแถว
update public.content_items ci
set workspace_id = (
  select wm.workspace_id
  from public.workspace_members wm
  where wm.user_id = ci.user_id
  order by wm.joined_at asc
  limit 1
)
where ci.workspace_id is null;

alter table public.content_items
  alter column workspace_id set not null;

-- ลบ policy เดิมแบบ user เดี่ยว
drop policy if exists "content_items_select_own" on public.content_items;
drop policy if exists "content_items_insert_own" on public.content_items;
drop policy if exists "content_items_update_own" on public.content_items;
drop policy if exists "content_items_delete_own" on public.content_items;

-- SELECT — ทุกสมาชิก workspace (รวม viewer)
drop policy if exists "content_items_select_workspace" on public.content_items;
create policy "content_items_select_workspace"
  on public.content_items for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

-- INSERT — เฉพาะ editor / admin + user_id ต้องเป็นเจ้าของการเขียน
drop policy if exists "content_items_insert_workspace_editor" on public.content_items;
create policy "content_items_insert_workspace_editor"
  on public.content_items for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  );

-- UPDATE — เฉพาะ editor / admin
drop policy if exists "content_items_update_workspace_editor" on public.content_items;
create policy "content_items_update_workspace_editor"
  on public.content_items for update
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  )
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  );

-- DELETE — เฉพาะ editor / admin
drop policy if exists "content_items_delete_workspace_editor" on public.content_items;
create policy "content_items_delete_workspace_editor"
  on public.content_items for delete
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  );

-- -----------------------------------------------------------------------------
-- 6. brief_drafts — ร่างแก้บรีฟต่อ workspace + user (ซิงค์ข้ามอุปกรณ์)
-- -----------------------------------------------------------------------------
create table if not exists public.brief_drafts (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  brief_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id, brief_key)
);

alter table public.brief_drafts enable row level security;

drop policy if exists "brief_drafts_select_own" on public.brief_drafts;
create policy "brief_drafts_select_own"
  on public.brief_drafts for select
  to authenticated
  using (
    user_id = auth.uid()
    and workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "brief_drafts_insert_own" on public.brief_drafts;
create policy "brief_drafts_insert_own"
  on public.brief_drafts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "brief_drafts_update_own" on public.brief_drafts;
create policy "brief_drafts_update_own"
  on public.brief_drafts for update
  to authenticated
  using (
    user_id = auth.uid()
    and workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  )
  with check (
    user_id = auth.uid()
    and workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "brief_drafts_delete_own" on public.brief_drafts;
create policy "brief_drafts_delete_own"
  on public.brief_drafts for delete
  to authenticated
  using (
    user_id = auth.uid()
    and workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'brief_drafts'
  ) then
    alter publication supabase_realtime add table public.brief_drafts;
  end if;
end $$;
