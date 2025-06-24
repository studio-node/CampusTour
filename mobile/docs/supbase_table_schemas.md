# Supasbase Table Schemas

## **locations**
```sql
create table public.locations (
  id uuid not null default gen_random_uuid (),
  school_id uuid null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  image_url text null,
  description text null,
  interests text[] null,
  is_tour_stop boolean null default true,
  order_index integer null,
  created_at timestamp with time zone null default now(),
  type public.location_type null,
  constraint locations_pkey primary key (id),
  constraint locations_school_id_fkey foreign KEY (school_id) references schools (id) on delete CASCADE
) TABLESPACE pg_default;
```

## **schools**
```sql
create table public.schools (
  id uuid not null default gen_random_uuid (),
  name text not null,
  city text null,
  state text null,
  created_at timestamp with time zone null default now(),
  coordinates jsonb null,
  primary_color text null default '#990000'::text,
  logo_url text null,
  constraint schools_pkey primary key (id)
) TABLESPACE pg_default;
```

## **analytics_events**
```sql
create table public.analytics_events (
  id uuid not null default gen_random_uuid (),
  event_type text not null,
  timestamp timestamp with time zone not null default now(),
  session_id text not null,
  school_id uuid not null,
  location_id uuid null,
  metadata jsonb null,
  constraint analytics_events_pkey primary key (id),
  constraint analytics_events_location_id_fkey foreign KEY (location_id) references locations (id),
  constraint analytics_events_school_id_fkey foreign KEY (school_id) references schools (id)
) TABLESPACE pg_default;
```