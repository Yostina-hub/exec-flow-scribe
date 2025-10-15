-- Grant Admin the ability to manage users/roles by seeding the required permission and mapping
-- This runs with elevated privileges and bypasses RLS, fixing the bootstrap deadlock

-- 1) Ensure the 'users:manage' permission exists
DO $$
DECLARE
  v_perm_id uuid;
BEGIN
  SELECT id INTO v_perm_id
  FROM public.permissions
  WHERE resource = 'users'::permission_resource
    AND action = 'manage'::permission_action;

  IF v_perm_id IS NULL THEN
    INSERT INTO public.permissions (resource, action)
    VALUES ('users', 'manage')
    RETURNING id INTO v_perm_id;
  END IF;
END $$;

-- 2) Ensure an 'Admin' role exists and capture its id
DO $$
DECLARE
  v_admin_role_id uuid;
BEGIN
  SELECT id INTO v_admin_role_id
  FROM public.roles
  WHERE lower(name) = 'admin';

  IF v_admin_role_id IS NULL THEN
    INSERT INTO public.roles (name)
    VALUES ('Admin')
    RETURNING id INTO v_admin_role_id;
  END IF;
END $$;

-- 3) Link Admin role to 'users:manage' permission
DO $$
DECLARE
  v_perm_id uuid;
  v_admin_role_id uuid;
BEGIN
  SELECT id INTO v_perm_id
  FROM public.permissions
  WHERE resource = 'users'::permission_resource
    AND action = 'manage'::permission_action;

  SELECT id INTO v_admin_role_id
  FROM public.roles
  WHERE lower(name) = 'admin';

  IF v_perm_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.role_permissions
      WHERE role_id = v_admin_role_id AND permission_id = v_perm_id
    ) THEN
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (v_admin_role_id, v_perm_id);
    END IF;
  END IF;
END $$;
