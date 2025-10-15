-- Drop existing restrictive policies on user_roles if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create comprehensive RLS policies for user_roles table

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Allow users with 'manage' permission on 'users' to view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Allow users with 'manage' permission on 'users' to insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Allow users with 'manage' permission on 'users' to update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Allow users with 'manage' permission on 'users' to delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Also ensure the has_permission function exists and works correctly
-- (This should already exist from previous migrations, but let's make sure it's correct)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource permission_resource, _action permission_action)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.resource = _resource
      AND p.action = _action
  )
$$;