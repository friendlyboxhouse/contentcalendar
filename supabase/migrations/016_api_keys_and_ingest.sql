-- ============================================================================
-- 016_api_keys_and_ingest.sql
-- API keys + ingest events for OpenClaw integration
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.workspace_api_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  prefix text not null,
  hashed_key text not null,
  scopes text[] not null default '{"ingest:write"}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists workspace_api_keys_workspace_idx
  on public.workspace_api_keys (workspace_id, revoked_at, created_at desc);
create unique index if not exists workspace_api_keys_prefix_idx
  on public.workspace_api_keys (prefix);

create table if not exists public.ingest_events (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  api_key_id uuid not null references public.workspace_api_keys(id) on delete cascade,
  source text not null,
  payload jsonb not null,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists ingest_events_workspace_idx
  on public.ingest_events (workspace_id, created_at desc);

alter table public.workspace_api_keys enable row level security;
alter table public.ingest_events enable row level security;

drop policy if exists "workspace_api_keys_select_admin" on public.workspace_api_keys;
create policy "workspace_api_keys_select_admin"
  on public.workspace_api_keys for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "workspace_api_keys_insert_admin" on public.workspace_api_keys;
create policy "workspace_api_keys_insert_admin"
  on public.workspace_api_keys for insert
  to authenticated
  with check (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );

drop policy if exists "workspace_api_keys_update_admin" on public.workspace_api_keys;
create policy "workspace_api_keys_update_admin"
  on public.workspace_api_keys for update
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

drop policy if exists "ingest_events_select_member" on public.ingest_events;
create policy "ingest_events_select_member"
  on public.ingest_events for select
  to authenticated
  using (
    workspace_id in (
      select wm.workspace_id from public.workspace_members wm
      where wm.user_id = auth.uid()
    )
  );
