-- Fix function search paths - drop trigger first

-- Drop the trigger first
DROP TRIGGER IF EXISTS assign_guest_role_trigger ON guest_access_requests;

-- Drop the function
DROP FUNCTION IF EXISTS public.assign_guest_role_on_approval();

-- Recreate the function with proper search_path
CREATE OR REPLACE FUNCTION public.assign_guest_role_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_role_id uuid;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get the Guest role ID
    SELECT id INTO v_guest_role_id
    FROM roles
    WHERE name = 'Guest'
    LIMIT 1;
    
    IF v_guest_role_id IS NOT NULL THEN
      -- Assign Guest role to the user if they don't already have it
      INSERT INTO user_roles (user_id, role_id)
      VALUES (NEW.user_id, v_guest_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER assign_guest_role_trigger
AFTER INSERT OR UPDATE ON guest_access_requests
FOR EACH ROW
EXECUTE FUNCTION assign_guest_role_on_approval();