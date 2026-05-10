-- ============================================================================
-- 017_workspace_bootstrap_rpc.sql
-- Consolidated workspace bootstrap payload for client performance
-- ============================================================================

create or replace function public.workspace_user_bootstrap(p_workspace uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_selected uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_workspace is not null
     and exists (
       select 1
       from public.workspace_members wm
       where wm.workspace_id = p_workspace and wm.user_id = v_uid
     ) then
    v_selected := p_workspace;
  else
    select wm.workspace_id
      into v_selected
    from public.workspace_members wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.user_id = v_uid
      and w.archived_at is null
    order by wm.joined_at asc
    limit 1;
  end if;

  return jsonb_build_object(
    'selected_workspace_id', v_selected,
    'workspaces',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', w.id,
            'name', w.name,
            'slug', w.slug,
            'role', wm.role
          )
          order by wm.joined_at asc
        )
        from public.workspace_members wm
        join public.workspaces w on w.id = wm.workspace_id
        where wm.user_id = v_uid
          and w.archived_at is null
      ), '[]'::jsonb),
    'members',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'user_id', wm.user_id,
            'role', wm.role,
            'email', p.email,
            'display_name', p.display_name
          )
          order by wm.joined_at asc
        )
        from public.workspace_members wm
        left join public.profiles p on p.id = wm.user_id
        where wm.workspace_id = v_selected
      ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.workspace_user_bootstrap(uuid) to authenticated;
