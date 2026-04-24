-- Adds a per-appointment general confirmation code for non-prospective users.
-- The code is a 6-character uppercase alphanumeric string (A-Z, 0-9).

BEGIN;

ALTER TABLE public.tour_appointments
  ADD COLUMN IF NOT EXISTS general_confirmation_code text;

-- Generate a 6-character code (A-Z0-9). We loop to avoid collisions.
CREATE OR REPLACE FUNCTION public.generate_general_confirmation_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.tour_appointments_set_general_confirmation_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
BEGIN
  IF NEW.general_confirmation_code IS NOT NULL AND length(NEW.general_confirmation_code) > 0 THEN
    RETURN NEW;
  END IF;

  LOOP
    code := public.generate_general_confirmation_code();
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.tour_appointments ta
      WHERE ta.general_confirmation_code = code
    );
  END LOOP;

  NEW.general_confirmation_code := code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_tour_appointments_set_general_confirmation_code ON public.tour_appointments;
CREATE TRIGGER trigger_tour_appointments_set_general_confirmation_code
BEFORE INSERT ON public.tour_appointments
FOR EACH ROW
EXECUTE FUNCTION public.tour_appointments_set_general_confirmation_code();

-- Backfill existing rows (if any).
UPDATE public.tour_appointments
SET general_confirmation_code = public.generate_general_confirmation_code()
WHERE general_confirmation_code IS NULL OR general_confirmation_code = '';

-- Enforce uniqueness for reliable validation.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tour_appointments_general_confirmation_code_key'
  ) THEN
    ALTER TABLE public.tour_appointments
      ADD CONSTRAINT tour_appointments_general_confirmation_code_key
      UNIQUE (general_confirmation_code);
  END IF;
END
$$;

COMMIT;

