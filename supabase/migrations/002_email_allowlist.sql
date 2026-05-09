-- จำกัดการเข้าใช้เฉพาะอีเมลในรายการ (เมื่อมีอย่างน้อย 1 แถวในตาราง)
-- ถ้าตารางว่าง = ไม่บังคับ allowlist (พฤติกรรมเดิม — ใครล็อกอินผ่าน Google ได้ตาม Supabase)

create table if not exists public.allowed_emails (
  email text primary key
);

alter table public.allowed_emails enable row level security;

-- ผู้ใช้ที่ล็อกอินแล้วเห็นได้แค่แถวที่ email ตรงกับตัวเอง (ใช้ตรวจว่าอยู่ในลิสต์หรือไม่)
drop policy if exists "allowed_emails_select_own_email_only" on public.allowed_emails;
create policy "allowed_emails_select_own_email_only"
  on public.allowed_emails for select
  to authenticated
  using (
    lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
  );

-- ไม่มี policy INSERT/UPDATE/DELETE สำหรับ authenticated → เพิ่มเมลได้ที่ SQL Editor (สิทธิ์ service / postgres)

create or replace function public.allowlist_has_any()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.allowed_emails limit 1);
$$;

revoke all on function public.allowlist_has_any() from public;
grant execute on function public.allowlist_has_any() to authenticated;
grant execute on function public.allowlist_has_any() to anon;
