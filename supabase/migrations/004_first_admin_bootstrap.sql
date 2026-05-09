-- เมื่อยังไม่มีแอดมินในระบบ ผู้ใช้ที่ล็อกอินสามารถเรียก claim_first_admin() จากแอปได้ครั้งเดียว
-- (เหมาะกับทีมเล็ก — ถ้ามีแอดมินแล้วฟังก์ชันจะไม่ทำอะไร)

create or replace function public.has_any_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where role = 'admin');
$$;

revoke all on function public.has_any_admin() from public;
grant execute on function public.has_any_admin() to authenticated;

create or replace function public.claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
  updated_rows int;
begin
  select count(*)::int into admin_count from public.profiles where role = 'admin';
  if admin_count > 0 then
    return false;
  end if;

  update public.profiles set role = 'admin' where id = auth.uid();
  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

revoke all on function public.claim_first_admin() from public;
grant execute on function public.claim_first_admin() to authenticated;
