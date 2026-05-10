-- ============================================================================
-- 012_discord_daily_summary.sql
-- Workspace-level Discord channel configuration + daily delivery logs
-- ============================================================================

create table if not exists public.workspace_discord_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_name text not null,
  webhook_url text not null,
  is_enabled boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_discord_channels_workspace_webhook_uniq
  on public.workspace_discord_channels (workspace_id, webhook_url);

create index if not exists workspace_discord_channels_workspace_idx
  on public.workspace_discord_channels (workspace_id);

alter table public.workspace_discord_channels enable row level security;

drop policy if exists "discord_channels_select_member" on public.workspace_discord_channels;
create policy "discord_channels_select_member"
  on public.workspace_discord_channels for select
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
    )
  );

drop policy if exists "discord_channels_insert_admin" on public.workspace_discord_channels;
create policy "discord_channels_insert_admin"
  on public.workspace_discord_channels for insert
  to authenticated
  with check (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  );

drop policy if exists "discord_channels_update_admin" on public.workspace_discord_channels;
create policy "discord_channels_update_admin"
  on public.workspace_discord_channels for update
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  )
  with check (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  );

drop policy if exists "discord_channels_delete_admin" on public.workspace_discord_channels;
create policy "discord_channels_delete_admin"
  on public.workspace_discord_channels for delete
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  );

create table if not exists public.workspace_discord_daily_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel_id uuid not null references public.workspace_discord_channels (id) on delete cascade,
  digest_date date not null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error_message text
);

create unique index if not exists workspace_discord_daily_logs_channel_day_uniq
  on public.workspace_discord_daily_logs (workspace_id, channel_id, digest_date);

create index if not exists workspace_discord_daily_logs_workspace_day_idx
  on public.workspace_discord_daily_logs (workspace_id, digest_date desc);

alter table public.workspace_discord_daily_logs enable row level security;

drop policy if exists "discord_logs_select_member" on public.workspace_discord_daily_logs;
create policy "discord_logs_select_member"
  on public.workspace_discord_daily_logs for select
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
    )
  );
