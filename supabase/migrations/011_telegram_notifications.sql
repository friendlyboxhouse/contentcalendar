-- ============================================================================
-- 011_telegram_notifications.sql
-- Telegram mapping + daily notification settings + one-time link tokens
-- ============================================================================

alter table public.profiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists telegram_notifications_enabled boolean not null default false,
  add column if not exists telegram_daily_time text not null default '08:00',
  add column if not exists telegram_timezone text not null default 'Asia/Bangkok',
  add column if not exists telegram_last_digest_on date;

alter table public.profiles
  drop constraint if exists profiles_telegram_daily_time_format;

alter table public.profiles
  add constraint profiles_telegram_daily_time_format
  check (telegram_daily_time ~ '^[0-2][0-9]:[0-5][0-9]$');

create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_user_idx
  on public.telegram_link_tokens (user_id, created_at desc);

create index if not exists telegram_link_tokens_expiry_idx
  on public.telegram_link_tokens (expires_at);

alter table public.telegram_link_tokens enable row level security;

drop policy if exists "telegram_link_tokens_select_own" on public.telegram_link_tokens;
create policy "telegram_link_tokens_select_own"
  on public.telegram_link_tokens for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "telegram_link_tokens_insert_own" on public.telegram_link_tokens;
create policy "telegram_link_tokens_insert_own"
  on public.telegram_link_tokens for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "telegram_link_tokens_delete_own" on public.telegram_link_tokens;
create policy "telegram_link_tokens_delete_own"
  on public.telegram_link_tokens for delete
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.issue_telegram_link_token(p_ttl_minutes int default 30)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_token text;
  v_expires_at timestamptz;
begin
  v_uid := (select auth.uid());
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_ttl_minutes is null or p_ttl_minutes < 5 or p_ttl_minutes > 1440 then
    raise exception 'invalid_ttl';
  end if;

  -- Keep one active token per user.
  delete from public.telegram_link_tokens
  where user_id = v_uid
    and used_at is null;

  v_expires_at := now() + make_interval(mins => p_ttl_minutes);

  loop
    v_token := encode(gen_random_bytes(18), 'hex');
    begin
      insert into public.telegram_link_tokens (token, user_id, expires_at)
      values (v_token, v_uid, v_expires_at);
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return v_token;
end;
$$;

revoke all on function public.issue_telegram_link_token(int) from public;
grant execute on function public.issue_telegram_link_token(int) to authenticated;
