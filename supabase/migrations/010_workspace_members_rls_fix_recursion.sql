-- ============================================================================
-- 010_workspace_members_rls_fix_recursion.sql
-- RLS on workspace_members must NOT subquery workspace_members (infinite
-- recursion). Use SECURITY DEFINER helpers that bypass RLS as table owner.
-- ============================================================================

-- Membership rows for the current session user only (no arbitrary user_id arg).
create or replace function public.current_user_workspace_access()
returns table (workspace_id uuid, role text)
language sql
stable
security definer
set search_path = public
as $$
  select wm.workspace_id, wm.role
  from public.workspace_members wm
  where wm.user_id = (select auth.uid());
$$;

-- Whether the given profile id shares any workspace with the current user.
create or replace function public.profile_visible_as_workspace_peer(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm1
    join public.workspace_members wm2
      on wm1.workspace_id = wm2.workspace_id
    where wm1.user_id = (select auth.uid())
      and wm2.user_id = profile_id
  );
$$;

revoke all on function public.current_user_workspace_access() from public;
grant execute on function public.current_user_workspace_access() to authenticated;

revoke all on function public.profile_visible_as_workspace_peer(uuid) from public;
grant execute on function public.profile_visible_as_workspace_peer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (
    id in (
      select u.workspace_id from public.current_user_workspace_access() u
    )
  );

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin"
  on public.workspaces for update
  to authenticated
  using (
    id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  )
  with check (
    id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- workspace_members
-- ---------------------------------------------------------------------------
drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
  on public.workspace_members for select
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
    )
  );

drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
create policy "workspace_members_insert_admin"
  on public.workspace_members for insert
  to authenticated
  with check (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  );

drop policy if exists "workspace_members_update_admin" on public.workspace_members;
create policy "workspace_members_update_admin"
  on public.workspace_members for update
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

drop policy if exists "workspace_members_delete_admin_or_self" on public.workspace_members;
create policy "workspace_members_delete_admin_or_self"
  on public.workspace_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- profiles — peer visibility without querying workspace_members under RLS
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_workspace_peer" on public.profiles;
create policy "profiles_select_workspace_peer"
  on public.profiles for select
  to authenticated
  using ( public.profile_visible_as_workspace_peer(id) );

-- ---------------------------------------------------------------------------
-- content_items
-- ---------------------------------------------------------------------------
drop policy if exists "content_items_select_workspace" on public.content_items;
create policy "content_items_select_workspace"
  on public.content_items for select
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
    )
  );

drop policy if exists "content_items_insert_workspace_editor" on public.content_items;
create policy "content_items_insert_workspace_editor"
  on public.content_items for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role in ('editor', 'admin')
    )
  );

drop policy if exists "content_items_update_workspace_editor" on public.content_items;
create policy "content_items_update_workspace_editor"
  on public.content_items for update
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role in ('editor', 'admin')
    )
  )
  with check (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role in ('editor', 'admin')
    )
  );

drop policy if exists "content_items_delete_workspace_editor" on public.content_items;
create policy "content_items_delete_workspace_editor"
  on public.content_items for delete
  to authenticated
  using (
    workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role in ('editor', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- brief_drafts
-- ---------------------------------------------------------------------------
drop policy if exists "brief_drafts_select_own" on public.brief_drafts;
create policy "brief_drafts_select_own"
  on public.brief_drafts for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
    )
  );

drop policy if exists "brief_drafts_insert_own" on public.brief_drafts;
create policy "brief_drafts_insert_own"
  on public.brief_drafts for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role in ('editor', 'admin')
    )
  );

drop policy if exists "brief_drafts_update_own" on public.brief_drafts;
create policy "brief_drafts_update_own"
  on public.brief_drafts for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role in ('editor', 'admin')
    )
  )
  with check (
    user_id = (select auth.uid())
    and workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
      where u.role in ('editor', 'admin')
    )
  );

drop policy if exists "brief_drafts_delete_own" on public.brief_drafts;
create policy "brief_drafts_delete_own"
  on public.brief_drafts for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and workspace_id in (
      select u.workspace_id from public.current_user_workspace_access() u
    )
  );
