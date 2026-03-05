-- Allow school admins to update their school (e.g. deadzones / no-go zones).
-- Uses same role check as locations: profile must belong to that school and role in admin set.
begin;

create policy "schools_update_admin_in_school"
on public.schools
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.school_id = schools.id
      and p.role in ('admin', 'super-admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.school_id = schools.id
      and p.role in ('admin', 'super-admin', 'super_admin')
  )
);

commit;
