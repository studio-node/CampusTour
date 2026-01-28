-- Adds builder passcode columns and tightens RLS on public.locations.
-- Apply this in your Supabase SQL editor (or migrations pipeline).
--
-- IMPORTANT:
-- - This assumes you use public.profiles with columns (id, school_id, role) where id = auth.users.id.
-- - It allows PUBLIC (anon) read access to locations (SELECT) so the builder page can preload location content.
--   If you want to lock this down later, we can scope reads to public contexts only.

begin;

-- -------------------------------------------------------------------------------------------------
-- Schema: builder passcode fields (stored as salted SHA-256 hash)
-- -------------------------------------------------------------------------------------------------

alter table public.locations
  add column if not exists builder_passcode_salt text,
  add column if not exists builder_passcode_hash text,
  add column if not exists builder_passcode_updated_at timestamptz;

comment on column public.locations.builder_passcode_salt is
  'Random salt for builder passcode hash. Used by Edge Functions to validate passcodes.';
comment on column public.locations.builder_passcode_hash is
  'SHA-256(salt || passcode) hex digest. Never store the builder passcode plaintext.';
comment on column public.locations.builder_passcode_updated_at is
  'Timestamp of last builder passcode rotation.';

-- -------------------------------------------------------------------------------------------------
-- RLS: lock down writes, keep reads public
-- -------------------------------------------------------------------------------------------------

alter table public.locations enable row level security;

-- Drop old policies (from docs/supabase_schemas/location_table_functions.sql) if present
drop policy if exists "Allow authenticated users to update locations in their school" on public.locations;
drop policy if exists "Allow authenticated users to delete locations in their school" on public.locations;

-- Drop our potential previous policy names (idempotency)
drop policy if exists "locations_select_public" on public.locations;
drop policy if exists "locations_insert_admin_in_school" on public.locations;
drop policy if exists "locations_update_admin_in_school" on public.locations;
drop policy if exists "locations_delete_admin_in_school" on public.locations;

-- Public read access so the builder page can preload location content.
create policy "locations_select_public"
on public.locations
for select
to anon, authenticated
using (true);

-- Admin-only writes, constrained to their school.
-- NOTE: Role strings vary across projects; this supports a few common spellings.
create policy "locations_insert_admin_in_school"
on public.locations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.school_id = locations.school_id
      and p.role in ('admin', 'super-admin', 'super_admin')
  )
);

create policy "locations_update_admin_in_school"
on public.locations
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.school_id = locations.school_id
      and p.role in ('admin', 'super-admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.school_id = locations.school_id
      and p.role in ('admin', 'super-admin', 'super_admin')
  )
);

create policy "locations_delete_admin_in_school"
on public.locations
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.school_id = locations.school_id
      and p.role in ('admin', 'super-admin', 'super_admin')
  )
);

commit;

