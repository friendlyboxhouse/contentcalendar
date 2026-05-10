-- ============================================================================
-- 018_tasks_and_assignments.sql
-- Trello-like workspace tasks + assignment roles
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.assignment_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  label text not null,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists public.task_lists (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  label text not null,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists public.task_types (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  label text not null,
  color text,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table if not exists public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  task_type_id uuid references public.task_types(id) on delete set null,
  list_id uuid references public.task_lists(id) on delete set null,
  due_at timestamptz,
  due_time text,
  position numeric not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assignment_roles_workspace_idx
  on public.assignment_roles (workspace_id, archived_at, position, created_at);
create index if not exists task_lists_workspace_idx
  on public.task_lists (workspace_id, archived_at, position, created_at);
create index if not exists task_types_workspace_idx
  on public.task_types (workspace_id, archived_at, position, created_at);
create index if not exists tasks_workspace_idx
  on public.tasks (workspace_id, list_id, due_at, position, created_at);

alter table public.assignment_roles enable row level security;
alter table public.task_lists enable row level security;
alter table public.task_types enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "assignment_roles_select_member" on public.assignment_roles;
create policy "assignment_roles_select_member"
  on public.assignment_roles for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "assignment_roles_insert_editor" on public.assignment_roles;
create policy "assignment_roles_insert_editor"
  on public.assignment_roles for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "assignment_roles_update_editor" on public.assignment_roles;
create policy "assignment_roles_update_editor"
  on public.assignment_roles for update
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  )
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "assignment_roles_delete_admin" on public.assignment_roles;
create policy "assignment_roles_delete_admin"
  on public.assignment_roles for delete
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "task_lists_select_member" on public.task_lists;
create policy "task_lists_select_member"
  on public.task_lists for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "task_lists_insert_editor" on public.task_lists;
create policy "task_lists_insert_editor"
  on public.task_lists for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "task_lists_update_editor" on public.task_lists;
create policy "task_lists_update_editor"
  on public.task_lists for update
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  )
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "task_lists_delete_admin" on public.task_lists;
create policy "task_lists_delete_admin"
  on public.task_lists for delete
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "task_types_select_member" on public.task_types;
create policy "task_types_select_member"
  on public.task_types for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "task_types_insert_editor" on public.task_types;
create policy "task_types_insert_editor"
  on public.task_types for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "task_types_update_editor" on public.task_types;
create policy "task_types_update_editor"
  on public.task_types for update
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  )
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "task_types_delete_admin" on public.task_types;
create policy "task_types_delete_admin"
  on public.task_types for delete
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "tasks_select_member" on public.tasks;
create policy "tasks_select_member"
  on public.tasks for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "tasks_insert_editor" on public.tasks;
create policy "tasks_insert_editor"
  on public.tasks for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "tasks_update_editor" on public.tasks;
create policy "tasks_update_editor"
  on public.tasks for update
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  )
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "tasks_delete_editor" on public.tasks;
create policy "tasks_delete_editor"
  on public.tasks for delete
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role in ('editor', 'admin')
    )
  );

create or replace function public.seed_default_task_entities(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.assignment_roles (workspace_id, slug, label, position)
  values
    (p_workspace_id, 'planner', 'คิด/วางแผน', 10),
    (p_workspace_id, 'producer', 'ถ่ายทำ', 20),
    (p_workspace_id, 'editor', 'ตัดต่อ', 30),
    (p_workspace_id, 'reviewer', 'ตรวจสอบ', 40),
    (p_workspace_id, 'manager', 'บริหาร', 50)
  on conflict (workspace_id, slug) do nothing;

  insert into public.task_lists (workspace_id, slug, label, position)
  values
    (p_workspace_id, 'todo', 'Backlog', 10),
    (p_workspace_id, 'in_progress', 'Doing', 20),
    (p_workspace_id, 'review', 'Review', 30),
    (p_workspace_id, 'done', 'Done', 40)
  on conflict (workspace_id, slug) do nothing;

  insert into public.task_types (workspace_id, slug, label, color, position)
  values
    (p_workspace_id, 'general', 'General', '#5B6CFF', 10),
    (p_workspace_id, 'marketing', 'Marketing', '#0EA5E9', 20),
    (p_workspace_id, 'design', 'Design', '#A855F7', 30),
    (p_workspace_id, 'internal', 'Internal', '#64748B', 40)
  on conflict (workspace_id, slug) do nothing;
end;
$$;

create or replace function public.trg_seed_task_entities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_task_entities(new.id);
  return new;
end;
$$;

drop trigger if exists workspaces_seed_task_entities on public.workspaces;
create trigger workspaces_seed_task_entities
  after insert on public.workspaces
  for each row
  execute procedure public.trg_seed_task_entities();

do $$
declare
  ws record;
begin
  for ws in select id from public.workspaces loop
    perform public.seed_default_task_entities(ws.id);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
