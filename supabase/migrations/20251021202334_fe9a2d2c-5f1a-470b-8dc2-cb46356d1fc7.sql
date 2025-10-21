
-- Drop existing restrictive policies on user_roles for INSERT
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users with manage users permission can assign roles" ON public.user_roles;

-- Create a helper function to check if user has Admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name = 'Admin'
  )
$$;

-- Create more permissive INSERT policies for user_roles
-- Allow users with Admin role OR users with manage permission to assign roles
CREATE POLICY "Admins and managers can insert roles"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  public.is_admin(auth.uid()) 
  OR 
  public.has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Update DELETE policy to use is_admin as well
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users with manage users permission can remove roles" ON public.user_roles;

CREATE POLICY "Admins and managers can delete roles"
ON public.user_roles
FOR DELETE
TO public
USING (
  public.is_admin(auth.uid())
  OR
  public.has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

CREATE POLICY "Admins and managers can update roles"
ON public.user_roles
FOR UPDATE
TO public
USING (
  public.is_admin(auth.uid())
  OR
  public.has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Update SELECT policy to be more permissive
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins and managers can view all roles"
ON public.user_roles
FOR SELECT
TO public
USING (
  public.is_admin(auth.uid())
  OR
  public.has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
  OR
  user_id = auth.uid()
);