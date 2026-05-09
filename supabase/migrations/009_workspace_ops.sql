-- ============================================================================
-- 009_workspace_ops.sql — invite allowlist + workspace merge helpers
-- ============================================================================

-- เชิญสมาชิก: เพิ่ม allowlist อัตโนมัติ + upsert membership
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
  normalized_email text;
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

  normalized_email := lower(trim(p_email));
  if normalized_email is null or normalized_email = '' then
    raise exception 'invalid email';
  end if;

  -- เพิ่ม allowlist ให้เข้าใช้งานเว็บได้ทันทีหลังถูกเชิญ
  insert into public.allowed_emails (email)
  values (normalized_email)
  on conflict (email) do nothing;

  select p.id into uid
  from public.profiles p
  where lower(trim(p.email)) = normalized_email
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

-- รวมข้อมูลจาก workspace ต้นทางเข้าปลายทาง (ใช้ตอนย้าย personal -> team workspace)
create or replace function public.merge_workspace_content(
  p_source_workspace uuid,
  p_target_workspace uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  moved_count integer := 0;
begin
  if p_source_workspace = p_target_workspace then
    raise exception 'source and target workspace must be different';
  end if;

  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_target_workspace
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  ) then
    raise exception 'workspace merge denied';
  end if;

  update public.content_items
    set workspace_id = p_target_workspace,
        updated_at = now()
  where workspace_id = p_source_workspace;
  get diagnostics moved_count = row_count;

  return moved_count;
end;
$$;

grant execute on function public.merge_workspace_content(uuid, uuid) to authenticated;
