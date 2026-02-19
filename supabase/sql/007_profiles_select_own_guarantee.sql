-- Guarantee every authenticated user can read their own profile (needed for getUserSchoolId).
-- Run this in Supabase SQL editor if User Management shows "Your account is not linked to a school."

begin;

-- Ensure RLS is on (idempotent)
alter table public.profiles enable row level security;

-- Recreate "select own" so the current user can always read their profile row
drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

commit;
