-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  school_id uuid NOT NULL,
  location_id uuid,
  metadata jsonb,
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT analytics_events_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL,
  school_id uuid NOT NULL,
  name text NOT NULL,
  identity text NOT NULL DEFAULT ''::text,
  address text NOT NULL,
  email text NOT NULL,
  date_of_birth date,
  gender text,
  grad_year smallint,
  tour_type USER-DEFINED,
  tour_appointment_id uuid,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT leads_tour_appointment_id_fkey FOREIGN KEY (tour_appointment_id) REFERENCES public.tour_appointments(id)
);
CREATE TABLE public.location_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  location_id uuid NOT NULL,
  stored_in_supabase boolean NOT NULL,
  media_type text NOT NULL,
  url text NOT NULL,
  CONSTRAINT location_media_pkey PRIMARY KEY (id),
  CONSTRAINT location_media_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  description text,
  interests ARRAY,
  default_stop boolean DEFAULT true,
  order_index integer,
  created_at timestamp with time zone DEFAULT now(),
  careers ARRAY,
  talking_points ARRAY,
  features ARRAY,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'ambassador'::text, 'admin'::text, 'super_admin'::text])),
  school_id uuid,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.public_ambassador_profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  CONSTRAINT public_ambassador_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT public_ambassador_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  state text,
  created_at timestamp with time zone DEFAULT now(),
  coordinates jsonb,
  primary_color text DEFAULT '#990000'::text,
  logo_url text,
  degrees_offered ARRAY,
  CONSTRAINT schools_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tour_appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL,
  school_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'active'::text, 'completed'::text, 'cancelled'::text])),
  qr_code_token text NOT NULL DEFAULT (gen_random_uuid())::text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tour_appointments_pkey PRIMARY KEY (id),
  CONSTRAINT tour_appointments_ambassador_id_fkey FOREIGN KEY (ambassador_id) REFERENCES public.profiles(id),
  CONSTRAINT tour_appointments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);