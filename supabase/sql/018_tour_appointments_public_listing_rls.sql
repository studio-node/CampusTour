-- Prospective students (anon + authenticated) must list scheduled ambassador-led tours
-- on tour-group-selection. Existing policies only allowed school admins and the assigned ambassador.
-- Also allow minimal profile read for ambassadors who appear on those tour rows (embedded select).

begin;

drop policy if exists "tour_appointments_select_public_scheduled" on public.tour_appointments;
create policy "tour_appointments_select_public_scheduled"
on public.tour_appointments
for select
to anon, authenticated
using (
  status in ('scheduled', 'active')
);

drop policy if exists "profiles_select_for_listed_tour_ambassador" on public.profiles;
create policy "profiles_select_for_listed_tour_ambassador"
on public.profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tour_appointments t
    where t.ambassador_id = profiles.id
      and t.status in ('scheduled', 'active')
  )
);

commit;
