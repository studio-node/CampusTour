-- Function to increment order_index for locations with equal or greater order_index
-- This ensures proper ordering when inserting a new location at a specific position
-- SECURITY DEFINER allows the function to bypass RLS policies
CREATE OR REPLACE FUNCTION increment_location_order_index()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_order_index INTEGER;
  affected_rows INTEGER;
BEGIN
  -- If order_index is NULL, set it to max + 1 for this school
  IF NEW.order_index IS NULL THEN
    SELECT COALESCE(MAX(order_index), -1) INTO max_order_index
    FROM public.locations
    WHERE school_id = NEW.school_id;
    
    -- Set the new location's order_index to max + 1 (or 0 if no locations exist)
    NEW.order_index := max_order_index + 1;
  ELSE
    -- Increment order_index for all locations in the same school
    -- that have order_index >= the new location's order_index
    -- Note: In BEFORE INSERT, the new row doesn't exist yet, so we don't need to exclude it
    UPDATE public.locations
    SET order_index = order_index + 1
    WHERE school_id = NEW.school_id
      AND order_index IS NOT NULL
      AND order_index >= NEW.order_index;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    -- Optional: Log for debugging (can be removed in production)
    -- RAISE NOTICE 'Incremented % rows for school_id % with order_index >= %', affected_rows, NEW.school_id, NEW.order_index;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_increment_location_order_index ON public.locations;

-- Create trigger that fires BEFORE INSERT on locations table
-- (BEFORE so we can modify NEW.order_index if it's NULL)
CREATE TRIGGER trigger_increment_location_order_index
  BEFORE INSERT ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION increment_location_order_index();

-- Add comment for documentation
COMMENT ON FUNCTION increment_location_order_index() IS 
'Automatically increments order_index for all locations in the same school that have an order_index >= the newly inserted location''s order_index. This maintains proper ordering when inserting locations at specific positions.';

-- Verification: Check if trigger exists
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'trigger_increment_location_order_index';

-- Test the trigger (example):
-- 1. Check current locations: SELECT id, name, order_index FROM locations WHERE school_id = 'your-school-id' ORDER BY order_index;
-- 2. Insert a new location with order_index = 1
-- 3. Check again - locations with order_index >= 1 should be incremented




-- ==============================================================================================================================
-- ======================================== UPDATE AND DELETE POLICIES =========================================
-- ==============================================================================================================================

-- RLS Policies for locations table
-- Allows authenticated users to update and delete locations for their school

-- Enable RLS on locations table (if not already enabled)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated users to update locations in their school" ON public.locations;
DROP POLICY IF EXISTS "Allow authenticated users to delete locations in their school" ON public.locations;

-- Policy: Allow authenticated users to UPDATE locations in their school
-- Users can only update locations where the location's school_id matches their profile's school_id
CREATE POLICY "Allow authenticated users to update locations in their school"
ON public.locations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = locations.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = locations.school_id
  )
);

-- Policy: Allow authenticated users to DELETE locations in their school
-- Users can only delete locations where the location's school_id matches their profile's school_id
CREATE POLICY "Allow authenticated users to delete locations in their school"
ON public.locations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.school_id = locations.school_id
  )
);