-- Create Guest role
INSERT INTO roles (name, description)
VALUES ('Guest', 'Guest user with limited access to approved meetings only')
ON CONFLICT (name) DO NOTHING;

-- Create function to check if user is a guest
CREATE OR REPLACE FUNCTION public.is_guest(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name = 'Guest'
  )
$$;

-- Create trigger function to automatically assign Guest role on guest signup
CREATE OR REPLACE FUNCTION public.assign_guest_role_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Create trigger on guest_access_requests
DROP TRIGGER IF EXISTS assign_guest_role_trigger ON guest_access_requests;
CREATE TRIGGER assign_guest_role_trigger
AFTER INSERT OR UPDATE ON guest_access_requests
FOR EACH ROW
EXECUTE FUNCTION assign_guest_role_on_approval();