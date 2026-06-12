-- Ambassador-led tour hardening:
--   1. Server-side confirmation-code verification (mobile no longer reads the code column).
--   2. live_tour_sessions read access scoped to non-ended sessions.
--   3. Ambassadors can update their own appointments (status transitions from mobile).
--   4. Capacity + status enforcement when leads sign up (no overbooking, no closed tours).
--   5. duration_minutes / meeting_location columns the admin tour-creation form writes.
--
-- NOTE: general_confirmation_code remains client-readable because the public webapp
-- signup flow (Information.vue) displays it to anonymous visitors by design. Making it
-- a real secret requires moving that flow server-side (per-lead codes); tracked separately.

BEGIN;

-- 1. Verify a general confirmation code without exposing the code itself.
CREATE OR REPLACE FUNCTION public.verify_general_confirmation_code(
  p_tour_appointment_id uuid,
  p_code text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tour_appointments ta
    WHERE ta.id = p_tour_appointment_id
      AND upper(trim(ta.general_confirmation_code)) = upper(trim(coalesce(p_code, '')))
  );
$$;

REVOKE ALL ON FUNCTION public.verify_general_confirmation_code(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_general_confirmation_code(uuid, text) TO anon, authenticated;

-- 2. Stop exposing ended (historical) live sessions; active ones stay readable because
--    anonymous tour members poll them for resume/roster state.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.live_tour_sessions;
CREATE POLICY "live_tour_sessions_select_not_ended"
  ON public.live_tour_sessions
  FOR SELECT
  USING (status <> 'ended');

-- 3. Ambassadors may update their own appointments (e.g. status scheduled -> active),
--    but cannot reassign them to someone else.
DROP POLICY IF EXISTS "tour_appointments_update_ambassador_own" ON public.tour_appointments;
CREATE POLICY "tour_appointments_update_ambassador_own"
  ON public.tour_appointments
  FOR UPDATE
  TO authenticated
  USING (ambassador_id = auth.uid())
  WITH CHECK (ambassador_id = auth.uid());

-- 4. Enforce capacity and appointment status at the database level. The previous trigger
--    incremented unconditionally, so concurrent signups could overbook and leads could be
--    attached to completed/cancelled tours.
CREATE OR REPLACE FUNCTION public.increment_tour_participants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  appt record;
BEGIN
  -- Only increment if the lead has a tour_appointment_id
  IF NEW.tour_appointment_id IS NOT NULL THEN
    SELECT status, participants_signed_up, max_participants
    INTO appt
    FROM public.tour_appointments
    WHERE id = NEW.tour_appointment_id
    FOR UPDATE;  -- serializes concurrent signups for the same appointment

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tour appointment % does not exist.', NEW.tour_appointment_id;
    END IF;

    IF appt.status NOT IN ('scheduled', 'active') THEN
      RAISE EXCEPTION 'Tour appointment % is not open for signups.', NEW.tour_appointment_id;
    END IF;

    IF appt.max_participants IS NOT NULL AND appt.participants_signed_up >= appt.max_participants THEN
      RAISE EXCEPTION 'Tour appointment % is full.', NEW.tour_appointment_id;
    END IF;

    UPDATE public.tour_appointments
    SET participants_signed_up = participants_signed_up + 1,
        updated_at = now()
    WHERE id = NEW.tour_appointment_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Columns the admin tour-creation form (AmbassadorTours.vue) writes but the table lacked.
ALTER TABLE public.tour_appointments
  ADD COLUMN IF NOT EXISTS duration_minutes smallint,
  ADD COLUMN IF NOT EXISTS meeting_location text;

COMMENT ON COLUMN public.tour_appointments.duration_minutes IS 'Planned tour length in minutes.';
COMMENT ON COLUMN public.tour_appointments.meeting_location IS 'Where the tour group meets on campus.';

COMMIT;
