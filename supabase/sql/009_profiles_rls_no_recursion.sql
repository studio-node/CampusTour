-- Fix infinite recursion: policies must not SELECT from profiles. Use a SECURITY DEFINER helper instead.
-- Run in Supabase SQL editor.

begin;

-- Helper: returns true if current user is an admin for the given school (reads profiles as definer, no RLS recursion)
create or replace function public.current_user_can_admin_school(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.school_id = p_school_id
      and lower(trim(p.role)) in ('admin', 'super-admin', 'super_admin', 'super admin')
  );
$$;

-- Drop policies that cause recursion (they select from profiles in the policy expression)
drop policy if exists "profiles_update_admin_same_school" on public.profiles;
drop policy if exists "profiles_select_admin_same_school" on public.profiles;

-- Recreate using the helper (no subquery on profiles in the policy)
create policy "profiles_update_admin_same_school"
on public.profiles
for update
to authenticated
using (public.current_user_can_admin_school(profiles.school_id))
with check (public.current_user_can_admin_school(profiles.school_id));

create policy "profiles_select_admin_same_school"
on public.profiles
for select
to authenticated
using (public.current_user_can_admin_school(profiles.school_id));

commit;
