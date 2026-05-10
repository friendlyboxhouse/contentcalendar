-- ============================================================================
-- 013_profile_avatars.sql
-- Profile avatar metadata for enterprise UI identity
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_color text,
  add column if not exists avatar_url text;
