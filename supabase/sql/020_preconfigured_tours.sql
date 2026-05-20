-- Ambassador-led preconfigured tours
-- Adds admin-managed template tours and links appointments to a chosen template.

CREATE TABLE IF NOT EXISTS public.preconfigured_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  stops_json jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preconfigured_tours_school_id_name_key UNIQUE (school_id, name),
  CONSTRAINT preconfigured_tours_stops_json_array_check CHECK (jsonb_typeof(stops_json) = 'array'),
  CONSTRAINT preconfigured_tours_non_empty_when_active_check CHECK ((NOT is_active) OR jsonb_array_length(stops_json) > 0)
);

ALTER TABLE public.tour_appointments
  ADD COLUMN IF NOT EXISTS preconfigured_tour_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tour_appointments_preconfigured_tour_id_fkey'
  ) THEN
    ALTER TABLE public.tour_appointments
      ADD CONSTRAINT tour_appointments_preconfigured_tour_id_fkey
      FOREIGN KEY (preconfigured_tour_id)
      REFERENCES public.preconfigured_tours(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS on_preconfigured_tours_updated ON public.preconfigured_tours;
CREATE TRIGGER on_preconfigured_tours_updated
  BEFORE UPDATE ON public.preconfigured_tours
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.preconfigured_tours ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.preconfigured_tours TO anon;
GRANT ALL ON TABLE public.preconfigured_tours TO authenticated;
GRANT ALL ON TABLE public.preconfigured_tours TO service_role;

DROP POLICY IF EXISTS preconfigured_tours_delete_admin_school ON public.preconfigured_tours;
CREATE POLICY preconfigured_tours_delete_admin_school
  ON public.preconfigured_tours
  FOR DELETE TO authenticated
  USING (public.current_user_can_admin_school(school_id));

DROP POLICY IF EXISTS preconfigured_tours_insert_admin_school ON public.preconfigured_tours;
CREATE POLICY preconfigured_tours_insert_admin_school
  ON public.preconfigured_tours
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_can_admin_school(school_id));

DROP POLICY IF EXISTS preconfigured_tours_select_admin_school ON public.preconfigured_tours;
CREATE POLICY preconfigured_tours_select_admin_school
  ON public.preconfigured_tours
  FOR SELECT TO authenticated
  USING (public.current_user_can_admin_school(school_id));

DROP POLICY IF EXISTS preconfigured_tours_select_ambassador_school_active ON public.preconfigured_tours;
CREATE POLICY preconfigured_tours_select_ambassador_school_active
  ON public.preconfigured_tours
  FOR SELECT TO authenticated
  USING (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.school_id = preconfigured_tours.school_id
        AND lower(p.role) = 'ambassador'
    )
  );

DROP POLICY IF EXISTS preconfigured_tours_select_public_active ON public.preconfigured_tours;
CREATE POLICY preconfigured_tours_select_public_active
  ON public.preconfigured_tours
  FOR SELECT TO authenticated, anon
  USING (is_active);

DROP POLICY IF EXISTS preconfigured_tours_update_admin_school ON public.preconfigured_tours;
CREATE POLICY preconfigured_tours_update_admin_school
  ON public.preconfigured_tours
  FOR UPDATE TO authenticated
  USING (public.current_user_can_admin_school(school_id))
  WITH CHECK (public.current_user_can_admin_school(school_id));

DROP POLICY IF EXISTS tour_appointments_insert_ambassador_impromptu ON public.tour_appointments;
CREATE POLICY tour_appointments_insert_ambassador_impromptu
  ON public.tour_appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    ambassador_id = auth.uid()
    AND preconfigured_tour_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.school_id = tour_appointments.school_id
        AND lower(p.role) = 'ambassador'
    )
  );

-- Seed one default template per school from current default stops.
INSERT INTO public.preconfigured_tours (
  school_id,
  name,
  description,
  stops_json,
  created_by
)
SELECT
  l.school_id,
  'Campus Highlights',
  'Auto-generated default template from current default tour stops.',
  jsonb_agg(
    jsonb_build_object(
      'location_id', l.id,
      'name', l.name,
      'description', l.description,
      'latitude', l.latitude,
      'longitude', l.longitude,
      'order_index', l.order_index
    )
    ORDER BY COALESCE(l.order_index, 2147483647), l.name
  ),
  (
    SELECT p.id
    FROM public.profiles p
    WHERE p.school_id = l.school_id
      AND lower(p.role) IN ('admin', 'super-admin', 'super_admin', 'super admin')
    ORDER BY p.created_at ASC NULLS LAST
    LIMIT 1
  )
FROM public.locations l
WHERE l.school_id IS NOT NULL
  AND COALESCE(l.default_stop, false) = true
GROUP BY l.school_id
HAVING count(*) > 0
ON CONFLICT (school_id, name) DO NOTHING;

-- Backfill existing appointments to school default template.
UPDATE public.tour_appointments ta
SET preconfigured_tour_id = pt.id
FROM public.preconfigured_tours pt
WHERE ta.preconfigured_tour_id IS NULL
  AND ta.school_id = pt.school_id
  AND pt.name = 'Campus Highlights';
