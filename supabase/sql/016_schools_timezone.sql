-- Add timezone to schools so appointments can be scheduled/displayed in school-local time.
-- Timezone should be an IANA TZ identifier (e.g. 'America/New_York').
begin;

alter table public.schools
add column if not exists timezone text;

comment on column public.schools.timezone is 'IANA timezone identifier for this school (e.g. America/New_York). Used for tour appointment scheduling/display.';

commit;
