-- Create enum for permission resources
CREATE TYPE public.permission_resource AS ENUM (
  'users',
  'roles',
  'meetings',
  'actions',
  'transcriptions',
  'settings'
);

-- Create enum for permission actions
CREATE TYPE public.permission_action AS ENUM (
  'create',
  'read',
  'update',
  'delete',
  'manage'
);

-- Create roles table for dynamic role management
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource permission_resource NOT NULL,
  action permission_action NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource, action)
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _resource permission_resource, _action permission_action)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Create security definer function to check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
  )
$$;

-- RLS Policies for roles table
CREATE POLICY "Anyone can view roles"
ON public.roles FOR SELECT
USING (true);

CREATE POLICY "Users with manage roles permission can create roles"
ON public.roles FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'roles', 'manage'));

CREATE POLICY "Users with manage roles permission can update roles"
ON public.roles FOR UPDATE
USING (public.has_permission(auth.uid(), 'roles', 'manage'));

CREATE POLICY "Users with manage roles permission can delete non-system roles"
ON public.roles FOR DELETE
USING (public.has_permission(auth.uid(), 'roles', 'manage') AND NOT is_system_role);

-- RLS Policies for permissions table
CREATE POLICY "Anyone can view permissions"
ON public.permissions FOR SELECT
USING (true);

-- RLS Policies for role_permissions table
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions FOR SELECT
USING (true);

CREATE POLICY "Users with manage roles permission can manage role permissions"
ON public.role_permissions FOR ALL
USING (public.has_permission(auth.uid(), 'roles', 'manage'));

-- RLS Policies for user_roles table
CREATE POLICY "Users can view all user roles"
ON public.user_roles FOR SELECT
USING (true);

CREATE POLICY "Users with manage users permission can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_permission(auth.uid(), 'users', 'manage'));

CREATE POLICY "Users with manage users permission can remove roles"
ON public.user_roles FOR DELETE
USING (public.has_permission(auth.uid(), 'users', 'manage'));

-- Insert default permissions
INSERT INTO public.permissions (resource, action, description) VALUES
  ('users', 'read', 'View users and their information'),
  ('users', 'manage', 'Create, update, and delete users'),
  ('roles', 'read', 'View roles and permissions'),
  ('roles', 'manage', 'Create, update, and delete roles and assign permissions'),
  ('meetings', 'create', 'Create meetings'),
  ('meetings', 'read', 'View meetings'),
  ('meetings', 'update', 'Update meetings'),
  ('meetings', 'delete', 'Delete meetings'),
  ('meetings', 'manage', 'Full control over all meetings'),
  ('actions', 'create', 'Create action items'),
  ('actions', 'read', 'View action items'),
  ('actions', 'update', 'Update action items'),
  ('actions', 'delete', 'Delete action items'),
  ('transcriptions', 'read', 'View transcriptions'),
  ('settings', 'manage', 'Manage system settings');

-- Insert default system roles
INSERT INTO public.roles (name, description, is_system_role) VALUES
  ('Admin', 'Full system access with all permissions', true),
  ('User', 'Standard user with basic permissions', true);

-- Assign all permissions to Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Admin';

-- Assign basic permissions to User role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'User'
  AND p.action = 'read';

-- Add trigger for updating updated_at on roles
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();