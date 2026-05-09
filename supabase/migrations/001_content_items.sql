-- Content Planner — per-user items + profiles (run in Supabase SQL Editor)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'editor' check (role in ('viewer', 'editor', 'admin')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.content_items (
  post_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists content_items_user_id_idx on public.content_items (user_id);

alter table public.content_items replica identity full;

alter table public.content_items enable row level security;

drop policy if exists "content_items_select_own" on public.content_items;
create policy "content_items_select_own"
  on public.content_items for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "content_items_insert_own" on public.content_items;
create policy "content_items_insert_own"
  on public.content_items for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "content_items_update_own" on public.content_items;
create policy "content_items_update_own"
  on public.content_items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "content_items_delete_own" on public.content_items;
create policy "content_items_delete_own"
  on public.content_items for delete
  to authenticated
  using (auth.uid() = user_id);

-- เพิ่มเข้า Realtime เฉพาะเมื่อยังไม่มีใน publication (รันซ้ำได้)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_items'
  ) then
    alter publication supabase_realtime add table public.content_items;
  end if;
end $$;
