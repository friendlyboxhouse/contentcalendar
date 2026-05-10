-- ============================================================================
-- 014_content_taxonomy.sql
-- Workspace-managed content type taxonomy
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.content_types (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  label text not null,
  description text,
  color text,
  icon text,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index if not exists content_types_workspace_idx
  on public.content_types (workspace_id, is_archived, sort_order, created_at);

alter table public.content_types enable row level security;

drop policy if exists "content_types_select_member" on public.content_types;
create policy "content_types_select_member"
  on public.content_types for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );

drop policy if exists "content_types_insert_editor" on public.content_types;
create policy "content_types_insert_editor"
  on public.content_types for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role in ('editor', 'admin')
    )
  );

drop policy if exists "content_types_update_editor" on public.content_types;
create policy "content_types_update_editor"
  on public.content_types for update
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

drop policy if exists "content_types_delete_admin" on public.content_types;
create policy "content_types_delete_admin"
  on public.content_types for delete
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.role = 'admin'
    )
  );

create or replace function public.seed_default_content_types(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.content_types (workspace_id, slug, label, sort_order, color, icon)
  values
    (p_workspace_id, 'educational', 'Educational', 10, '#5B6CFF', 'school'),
    (p_workspace_id, 'entertaining', 'Entertaining', 20, '#00A76F', 'celebration'),
    (p_workspace_id, 'promotional', 'Promotional', 30, '#F59E0B', 'campaign'),
    (p_workspace_id, 'inspirational', 'Inspirational', 40, '#A855F7', 'auto_awesome'),
    (p_workspace_id, 'ugc', 'UGC', 50, '#0EA5E9', 'group')
  on conflict (workspace_id, slug) do nothing;
end;
$$;

create or replace function public.trg_seed_content_types()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_content_types(new.id);
  return new;
end;
$$;

drop trigger if exists workspaces_seed_content_types on public.workspaces;
create trigger workspaces_seed_content_types
  after insert on public.workspaces
  for each row
  execute procedure public.trg_seed_content_types();

do $$
declare
  ws record;
begin
  for ws in select id from public.workspaces loop
    perform public.seed_default_content_types(ws.id);
  end loop;
end $$;
