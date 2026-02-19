-- RLS on profiles so school admins can update (and deactivate) users in their school.
-- Apply in Supabase SQL editor (or migrations pipeline).

begin;

alter table public.profiles enable row level security;

-- Allow update only if caller is admin (or super-admin) in the same school as the target profile
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
      and caller.role in ('admin', 'super-admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles caller
    where caller.id = auth.uid()
      and caller.school_id = profiles.school_id
      and caller.role in ('admin', 'super-admin', 'super_admin')
  )
);

-- Allow users to read their own profile (e.g. for settings)
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Allow admins to select profiles in their school (so list + edit form can work; RPC already returns data, but if client ever selects one row)
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
      and caller.role in ('admin', 'super-admin', 'super_admin')
  )
);

commit;
