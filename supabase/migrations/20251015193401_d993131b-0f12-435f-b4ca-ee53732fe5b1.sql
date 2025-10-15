-- Bootstrap policy for role_permissions while no user has any role yet
DROP POLICY IF EXISTS "Bootstrap: manage role_permissions until first assignment" ON public.role_permissions;
CREATE POLICY "Bootstrap: manage role_permissions until first assignment"
ON public.role_permissions
FOR ALL
USING ((SELECT COUNT(*) FROM public.user_roles) = 0)
WITH CHECK ((SELECT COUNT(*) FROM public.user_roles) = 0);

-- Optional: Gate roles creation during bootstrap to avoid lock-in
DROP POLICY IF EXISTS "Bootstrap: create roles until first assignment" ON public.roles;
CREATE POLICY "Bootstrap: create roles until first assignment"
ON public.roles
FOR INSERT
WITH CHECK ((SELECT COUNT(*) FROM public.user_roles) = 0);
