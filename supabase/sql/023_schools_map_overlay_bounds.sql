-- Add map_overlay_bounds to schools: makes the map's building-outline overlay
-- per-school instead of hardcoded to a single school's UUID/coordinates in the
-- mobile app. Stored as JSONB: a two-point bounding box [[lat, lng], [lat, lng]]
-- matching react-native-maps' Overlay `bounds` prop shape.
-- Note: the overlay *image* itself is still a single bundled asset in the mobile
-- app (there's no per-school image upload path yet) — this only removes the
-- hardcoded school-ID check and coordinates from the client.
alter table public.schools
  add column if not exists map_overlay_bounds jsonb;

comment on column public.schools.map_overlay_bounds is 'Two-point bounding box [[lat,lng],[lat,lng]] for the map building-outline overlay image. Null means no overlay for this school.';

-- Backfill the bounds previously hardcoded in mobile/app/(tabs)/map.tsx for Utah Tech.
update public.schools
set map_overlay_bounds = '[[37.09755260505361, -113.57264516743909], [37.10815778141483, -113.55942540472526]]'::jsonb
where id = 'e5a9dfd2-0c88-419e-b891-0a62283b8abd'
  and map_overlay_bounds is null;

-- primary_color's default was Utah Tech's actual brand red, so every newly onboarded
-- school silently inherited it until someone remembered to set their real color.
-- Switch the default to a brand-neutral slate matching the mobile app's fallback
-- (see DEFAULT_PRIMARY_COLOR in mobile/hooks/useSchoolPrimaryColor.ts). Existing rows
-- are untouched.
alter table public.schools
  alter column primary_color set default '#334155';
