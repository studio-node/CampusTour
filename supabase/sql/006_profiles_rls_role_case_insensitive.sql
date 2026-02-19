-- Fix profiles update/select policies: match role case-insensitively so 'Admin', 'admin', etc. work.
-- Apply in Supabase SQL editor after 005.

begin;

drop policy if exists "profiles_update_admin_same_school" on public.profiles;
drop policy if exists "profiles_select_admin_same_school" on public.profiles;

create policy "profiles_update_admin_same_school"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles caller
    where caller.id = auth.uid()
      and caller.school_id = profiles.school_id
      and lower(trim(caller.role)) in ('admin', 'super-admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles caller
    where caller.id = auth.uid()
      and caller.school_id = profiles.school_id
      and lower(trim(caller.role)) in ('admin', 'super-admin', 'super_admin')
  )
);

create policy "profiles_select_admin_same_school"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles caller
    where caller.id = auth.uid()
      and caller.school_id = profiles.school_id
      and lower(trim(caller.role)) in ('admin', 'super-admin', 'super_admin')
  )
);

commit;
