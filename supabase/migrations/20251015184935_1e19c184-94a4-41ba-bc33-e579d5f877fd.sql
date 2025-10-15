-- Bootstrap policy to allow first admin assignment
DROP POLICY IF EXISTS "Bootstrap: first admin can self-assign" ON public.user_roles;
CREATE POLICY "Bootstrap: first admin can self-assign"
ON public.user_roles
FOR INSERT
WITH CHECK (
  (SELECT COUNT(*) FROM public.user_roles) = 0
  AND user_id = auth.uid()
  AND role_id = (
    SELECT id FROM public.roles WHERE name = 'Admin' LIMIT 1
  )
);