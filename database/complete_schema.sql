--
-- Meeting Management System - Complete Database Schema
-- Generated: 2025-10-18
-- PostgreSQL Database Export
--

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE public.action_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'blocked',
    'cancelled'
);

CREATE TYPE public.action_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

CREATE TYPE public.meeting_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE public.agenda_item_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped'
);

CREATE TYPE public.permission_resource AS ENUM (
    'meetings',
    'actions',
    'reports',
    'users',
    'settings'
);

CREATE TYPE public.permission_action AS ENUM (
    'view',
    'create',
    'update',
    'delete',
    'manage'
);

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    email text,
    avatar_url text,
    phone text,
    department text,
    position text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles Table
CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- User Roles Table
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid REFERENCES public.profiles(id),
    UNIQUE(user_id, role_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Permissions Table
CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    resource public.permission_resource NOT NULL,
    action public.permission_action NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(resource, action)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Role Permissions Table
CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Meetings Table
CREATE TABLE public.meetings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    location text,
    meeting_url text,
    status public.meeting_status DEFAULT 'scheduled' NOT NULL,
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid REFERENCES public.event_categories(id),
    recurrence_rule text,
    recurrence_end_date date,
    parent_meeting_id uuid REFERENCES public.meetings(id)
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Meeting Attendees Table
CREATE TABLE public.meeting_attendees (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'required',
    attendance_confirmed boolean DEFAULT false,
    attended boolean DEFAULT false,
    response_status text DEFAULT 'none',
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

-- Agenda Items Table
CREATE TABLE public.agenda_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    duration_minutes integer,
    order_index integer NOT NULL,
    status public.agenda_item_status DEFAULT 'pending' NOT NULL,
    presenter_id uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;

-- Action Items Table
CREATE TABLE public.action_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
    assigned_to uuid NOT NULL REFERENCES public.profiles(id),
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    due_date date,
    priority public.action_priority DEFAULT 'medium' NOT NULL,
    status public.action_status DEFAULT 'pending' NOT NULL,
    status_detail text,
    blocked_reason text,
    eta timestamp with time zone,
    escalation_level integer DEFAULT 0,
    escalated_to uuid REFERENCES public.profiles(id),
    escalated_at timestamp with time zone,
    last_nudge_sent timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Decisions Table
CREATE TABLE public.decisions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    decision_text text NOT NULL,
    context text,
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- Transcriptions Table
CREATE TABLE public.transcriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    speaker_id uuid REFERENCES public.profiles(id),
    speaker_name text,
    content text NOT NULL,
    timestamp timestamp with time zone DEFAULT now() NOT NULL,
    confidence numeric(3,2),
    language_code text DEFAULT 'en',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Meeting Minutes Table
CREATE TABLE public.meeting_minutes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    content text NOT NULL,
    summary text,
    generated_by uuid REFERENCES public.profiles(id),
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid REFERENCES public.profiles(id),
    approved_at timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    is_final boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADDITIONAL TABLES
-- ============================================

-- Event Categories Table
CREATE TABLE public.event_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    color_hex text NOT NULL,
    created_by uuid REFERENCES public.profiles(id),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- Action Status Updates Table
CREATE TABLE public.action_status_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    action_id uuid NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id),
    old_status public.action_status,
    new_status public.action_status,
    old_status_detail text,
    new_status_detail text,
    comment text,
    eta timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.action_status_updates ENABLE ROW LEVEL SECURITY;

-- AI Provider Preferences Table
CREATE TABLE public.ai_provider_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    provider text DEFAULT 'lovable_ai' NOT NULL,
    gemini_api_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_provider_preferences ENABLE ROW LEVEL SECURITY;

-- Meeting Media Table
CREATE TABLE public.meeting_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    media_type text NOT NULL,
    file_url text NOT NULL,
    file_size bigint,
    duration_seconds integer,
    format text,
    checksum text NOT NULL,
    uploaded_by uuid NOT NULL REFERENCES public.profiles(id),
    metadata jsonb DEFAULT '{}',
    uploaded_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.meeting_media ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Function: Handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: Check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource permission_resource, _action permission_action)
RETURNS boolean
LANGUAGE sql
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

-- Function: Check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
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

-- Function: Get users with specific role
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

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: Update profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Update meetings updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: Update action_items updated_at
CREATE TRIGGER update_action_items_updated_at
  BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Profiles Policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Roles Policies
CREATE POLICY "Anyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.roles FOR ALL
  USING (has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action));

-- User Roles Policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action));

-- Meetings Policies
CREATE POLICY "Users can view meetings they're invited to"
  ON public.meetings FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM meeting_attendees WHERE meeting_id = meetings.id
    )
  );

CREATE POLICY "Users can create meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Meeting creators can update their meetings"
  ON public.meetings FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Meeting creators can delete their meetings"
  ON public.meetings FOR DELETE
  USING (auth.uid() = created_by);

-- Meeting Attendees Policies
CREATE POLICY "Users can view their attendee rows"
  ON public.meeting_attendees FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Meeting creators can manage attendees"
  ON public.meeting_attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_attendees.meeting_id AND m.created_by = auth.uid()
    )
  );

-- Agenda Items Policies
CREATE POLICY "Users can view agenda for their meetings"
  ON public.agenda_items FOR SELECT
  USING (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Meeting creators can manage agenda"
  ON public.agenda_items FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
  );

-- Action Items Policies
CREATE POLICY "Users can view their action items"
  ON public.action_items FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can create action items"
  ON public.action_items FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Assignees can update their actions"
  ON public.action_items FOR UPDATE
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- Decisions Policies
CREATE POLICY "Users can view decisions from their meetings"
  ON public.decisions FOR SELECT
  USING (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can create decisions"
  ON public.decisions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Transcriptions Policies
CREATE POLICY "Users can view transcriptions from their meetings"
  ON public.transcriptions FOR SELECT
  USING (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can create transcriptions"
  ON public.transcriptions FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

-- Meeting Minutes Policies
CREATE POLICY "Users can view minutes from their meetings"
  ON public.meeting_minutes FOR SELECT
  USING (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can create minutes"
  ON public.meeting_minutes FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

-- Event Categories Policies
CREATE POLICY "Anyone can view active categories"
  ON public.event_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.event_categories FOR ALL
  USING (has_permission(auth.uid(), 'meetings'::permission_resource, 'manage'::permission_action));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX idx_meetings_created_by ON public.meetings(created_by);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meeting_attendees_user_id ON public.meeting_attendees(user_id);
CREATE INDEX idx_meeting_attendees_meeting_id ON public.meeting_attendees(meeting_id);
CREATE INDEX idx_action_items_assigned_to ON public.action_items(assigned_to);
CREATE INDEX idx_action_items_status ON public.action_items(status);
CREATE INDEX idx_action_items_due_date ON public.action_items(due_date);
CREATE INDEX idx_transcriptions_meeting_id ON public.transcriptions(meeting_id);
CREATE INDEX idx_decisions_meeting_id ON public.decisions(meeting_id);

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Full system access and user management'),
  ('moderator', 'Can manage meetings and content'),
  ('user', 'Standard user access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO public.permissions (resource, action, description) VALUES
  ('meetings', 'view', 'View meetings'),
  ('meetings', 'create', 'Create meetings'),
  ('meetings', 'update', 'Update meetings'),
  ('meetings', 'delete', 'Delete meetings'),
  ('meetings', 'manage', 'Full meeting management'),
  ('actions', 'view', 'View action items'),
  ('actions', 'create', 'Create action items'),
  ('actions', 'update', 'Update action items'),
  ('actions', 'delete', 'Delete action items'),
  ('users', 'view', 'View users'),
  ('users', 'manage', 'Manage users and roles'),
  ('reports', 'view', 'View reports'),
  ('settings', 'manage', 'Manage system settings')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign basic permissions to user role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'user' 
  AND p.action IN ('view', 'create', 'update')
  AND p.resource IN ('meetings', 'actions')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- COMPLETION
-- ============================================

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Database schema created successfully
