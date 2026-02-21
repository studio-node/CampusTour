-- Add deadzones column to schools for routing: areas that walking directions should avoid.
-- Stored as JSONB: array of polygons; each polygon is an array of { latitude, longitude } points.
-- Example: [ [ {"latitude": 37.103, "longitude": -113.566}, ... ], [ ... ] ]
alter table public.schools
  add column if not exists deadzones jsonb default '[]'::jsonb;

comment on column public.schools.deadzones is 'Polygons (array of {latitude, longitude}[]) that routes must not pass through. Used when computing walking directions.';
