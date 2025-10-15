-- Insert escalation-specific roles into existing roles table
INSERT INTO public.roles (name, description, is_system_role)
VALUES 
  ('Chief of Staff', 'Receives level 1 escalations for blocked or at-risk actions', true),
  ('CEO', 'Receives level 2 escalations and weekly progress reports', true)
ON CONFLICT (name) DO NOTHING;

-- Create helper function to get users with a specific role name
CREATE OR REPLACE FUNCTION public.get_users_with_role_name(_role_name text)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  INNER JOIN roles r ON r.id = ur.role_id
  WHERE r.name = _role_name
$$;