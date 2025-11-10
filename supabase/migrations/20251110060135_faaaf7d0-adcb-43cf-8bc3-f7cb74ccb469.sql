-- Add admin policies for profiles management
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO public
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

-- Add admin policy for viewing all profiles (already exists but let's ensure it's comprehensive)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  true  -- Everyone can view profiles, but we could restrict this if needed
);

-- Ensure the user_roles policies work correctly
-- Drop old bootstrap policies that might interfere
DROP POLICY IF EXISTS "Bootstrap: first admin can self-assign" ON public.user_roles;
DROP POLICY IF EXISTS "Bootstrap: initial admin can assign to anyone" ON public.user_roles;

-- Ensure admins can properly manage role assignments with USING and WITH CHECK
DROP POLICY IF EXISTS "Admins and managers can insert roles" ON public.user_roles;
CREATE POLICY "Admins and managers can insert roles"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

DROP POLICY IF EXISTS "Admins and managers can update roles" ON public.user_roles;
CREATE POLICY "Admins and managers can update roles"
ON public.user_roles
FOR UPDATE
TO public
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
)
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);

DROP POLICY IF EXISTS "Admins and managers can delete roles" ON public.user_roles;
CREATE POLICY "Admins and managers can delete roles"
ON public.user_roles
FOR DELETE
TO public
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action)
);