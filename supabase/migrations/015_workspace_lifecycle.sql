-- ============================================================================
-- 015_workspace_lifecycle.sql
-- Workspace lifecycle + invite links
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

alter table public.workspaces
  add column if not exists archived_at timestamptz;

create table if not exists public.workspace_invites (
  token text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_invites_workspace_idx
  on public.workspace_invites (workspace_id, expires_at);

alter table public.workspace_invites enable row level security;

drop policy if exists "workspace_invites_select_admin" on public.workspace_invites;
create policy "workspace_invites_select_admin"
  on public.workspace_invites for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "workspace_invites_insert_admin" on public.workspace_invites;
create policy "workspace_invites_insert_admin"
  on public.workspace_invites for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "workspace_invites_delete_admin" on public.workspace_invites;
create policy "workspace_invites_delete_admin"
  on public.workspace_invites for delete
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

create or replace function public.issue_workspace_invite(
  p_workspace uuid,
  p_ttl_minutes int default 1440
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  ) then
    raise exception 'workspace invite denied';
  end if;

  if p_ttl_minutes is null or p_ttl_minutes < 10 or p_ttl_minutes > 10080 then
    p_ttl_minutes := 1440;
  end if;

  v_token := encode(extensions.gen_random_bytes(18), 'hex');
  insert into public.workspace_invites (token, workspace_id, created_by, expires_at)
  values (v_token, p_workspace, auth.uid(), now() + make_interval(mins => p_ttl_minutes));
  return v_token;
end;
$$;

create or replace function public.accept_workspace_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.workspace_invites
    set used_at = now()
  where token = p_token
    and used_at is null
    and expires_at > now()
  returning workspace_id into v_workspace;

  if v_workspace is null then
    raise exception 'invite_invalid_or_expired';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (v_workspace, auth.uid(), 'editor', auth.uid())
  on conflict (workspace_id, user_id) do nothing;

  return v_workspace;
end;
$$;

grant execute on function public.issue_workspace_invite(uuid, int) to authenticated;
grant execute on function public.accept_workspace_invite(text) to authenticated;
