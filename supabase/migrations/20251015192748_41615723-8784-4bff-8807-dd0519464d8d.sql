-- Expand bootstrap to allow first admin assignment to any user when no roles exist
DROP POLICY IF EXISTS "Bootstrap: initial admin can assign to anyone" ON public.user_roles;
CREATE POLICY "Bootstrap: initial admin can assign to anyone"
ON public.user_roles
FOR INSERT
WITH CHECK (
  (SELECT COUNT(*) FROM public.user_roles) = 0
  AND assigned_by = auth.uid()
  AND role_id = (
    SELECT id FROM public.roles WHERE name = 'Admin' LIMIT 1
  )
);

-- Keep existing admin policies intact