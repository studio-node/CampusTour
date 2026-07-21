-- Lock down prospective-student PII in `leads` and move per-lead confirmation-code
-- verification server-side (mirrors what 021 did for the general confirmation code).
--
-- Before this migration, `leads` had `FOR SELECT USING (true)`, so anyone holding the
-- app's anon key could `select * from leads` and dump every prospective student's name,
-- email, DOB and tour history across ALL schools. The per-lead confirmation code was also
-- checked client-side, so it was readable / brute-forceable straight off the table.
--
-- After this migration:
--   * leads SELECT is restricted to the appointment's assigned ambassador and school admins.
--   * verify_lead_confirmation_code() validates the code SECURITY DEFINER and returns only
--     the id + first_name the app needs on success — the code is never sent to the client.
--   * anonymous INSERT (lead capture) stays allowed but must reference a real school.

BEGIN;

-- 1. Verify a per-lead confirmation code without exposing the code (or any other lead
--    column) to the client. Returns the matched lead's id + first_name, or no rows.
CREATE OR REPLACE FUNCTION public.verify_lead_confirmation_code(
  p_tour_appointment_id uuid,
  p_code text
)
RETURNS TABLE (id uuid, first_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.first_name
  FROM public.leads l
  WHERE l.tour_appointment_id = p_tour_appointment_id
    AND upper(trim(l.appointment_confirmation)) = upper(trim(coalesce(p_code, '')))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_lead_confirmation_code(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_lead_confirmation_code(uuid, text) TO anon, authenticated;

-- 2. Replace the wide-open SELECT policy with scoped access.
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;

-- School admins / super admins can read leads for their school.
CREATE POLICY "leads_select_admin_school"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.current_user_can_admin_school(leads.school_id));

-- The ambassador assigned to a lead's appointment can read that lead (roster screen).
CREATE POLICY "leads_select_ambassador_own"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tour_appointments ta
      WHERE ta.id = leads.tour_appointment_id
        AND ta.ambassador_id = auth.uid()
    )
  );

-- 3. Anonymous lead capture must stay possible, but the previous policy was named
--    "authenticated users only" while actually allowing everyone with WITH CHECK (true).
--    Rename it and at minimum require the referenced school to exist.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.leads;

CREATE POLICY "leads_insert_valid_school"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schools s WHERE s.id = leads.school_id
    )
  );

COMMIT;
