-- Admin tour_appointments policies:
-- - Admins can SELECT/INSERT/UPDATE/DELETE appointments for their own school.
-- - Super admins can SELECT/INSERT/UPDATE/DELETE across schools.
-- - Ambassadors can only SELECT appointments where they are assigned.
begin;

-- Enable RLS (policies are a no-op otherwise)
alter table public.tour_appointments enable row level security;

-- Helpers (SECURITY DEFINER avoids policy recursion and keeps expressions simple)
create or replace function public.current_user_is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(trim(p.role)) in ('super_admin', 'super-admin', 'super admin')
  );
$$;

create or replace function public.current_user_can_admin_school(p_school_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.current_user_is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.school_id = p_school_id
        and lower(trim(p.role)) in ('admin', 'super_admin', 'super-admin', 'super admin')
    );
$$;

-- Drop old policies (schema currently contains broad/global ones)
drop policy if exists "Admins can view all appointments" on public.tour_appointments;
drop policy if exists "Ambassadors can create appointments" on public.tour_appointments;
drop policy if exists "Ambassadors can update own appointments" on public.tour_appointments;
drop policy if exists "Ambassadors can view own appointments" on public.tour_appointments;

-- SELECT
create policy "tour_appointments_select_admin_school"
on public.tour_appointments
for select
to authenticated
using (public.current_user_can_admin_school(tour_appointments.school_id));

create policy "tour_appointments_select_ambassador_own"
on public.tour_appointments
for select
to authenticated
using (tour_appointments.ambassador_id = auth.uid());

-- INSERT
create policy "tour_appointments_insert_admin_school"
on public.tour_appointments
for insert
to authenticated
with check (public.current_user_can_admin_school(tour_appointments.school_id));

-- UPDATE
create policy "tour_appointments_update_admin_school"
on public.tour_appointments
for update
to authenticated
using (public.current_user_can_admin_school(tour_appointments.school_id))
with check (public.current_user_can_admin_school(tour_appointments.school_id));

-- DELETE
create policy "tour_appointments_delete_admin_school"
on public.tour_appointments
for delete
to authenticated
using (public.current_user_can_admin_school(tour_appointments.school_id));

commit;
