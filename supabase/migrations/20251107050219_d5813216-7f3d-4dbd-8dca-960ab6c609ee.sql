-- Create organizational departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_am TEXT, -- Amharic name
  description TEXT,
  parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  head_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1, -- 1=Executive, 2=Manager/Dept, 3=Team
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(name)
);

-- Create user-department assignments (many-to-many for flexibility)
CREATE TABLE IF NOT EXISTS public.user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- Create Guba task system settings
CREATE TABLE IF NOT EXISTS public.guba_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  auto_generate_on_minutes BOOLEAN DEFAULT true,
  auto_assign_enabled BOOLEAN DEFAULT true,
  preferred_language TEXT DEFAULT 'en', -- 'en' or 'am'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create AI-generated task proposals table
CREATE TABLE IF NOT EXISTS public.guba_task_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'minutes', 'document', 'manual'
  source_id UUID, -- reference to minutes/document
  generated_tasks JSONB NOT NULL, -- array of task objects
  language TEXT DEFAULT 'en',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  selected_task_ids TEXT[] DEFAULT ARRAY[]::TEXT[] -- array of selected task IDs
);

-- Extend action_items with Guba-specific fields
ALTER TABLE public.action_items 
ADD COLUMN IF NOT EXISTS source_proposal_id UUID REFERENCES public.guba_task_proposals(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guba_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guba_task_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Anyone can view departments"
ON public.departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for user_departments
CREATE POLICY "Users can view their department assignments"
ON public.user_departments FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage department assignments"
ON public.user_departments FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- RLS Policies for guba_settings
CREATE POLICY "Users can manage their own Guba settings"
ON public.guba_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policies for guba_task_proposals
CREATE POLICY "Users can view proposals from their meetings"
ON public.guba_task_proposals FOR SELECT
TO authenticated
USING (
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
  OR created_by = auth.uid()
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can create task proposals"
ON public.guba_task_proposals FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Proposal creators can update their proposals"
ON public.guba_task_proposals FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Indexes for performance
CREATE INDEX idx_departments_parent ON public.departments(parent_department_id);
CREATE INDEX idx_departments_level ON public.departments(level);
CREATE INDEX idx_user_departments_user ON public.user_departments(user_id);
CREATE INDEX idx_user_departments_dept ON public.user_departments(department_id);
CREATE INDEX idx_guba_proposals_meeting ON public.guba_task_proposals(meeting_id);
CREATE INDEX idx_guba_proposals_status ON public.guba_task_proposals(status);
CREATE INDEX idx_action_items_department ON public.action_items(department_id);

-- Trigger for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guba_settings_updated_at
BEFORE UPDATE ON public.guba_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample departments (Ethiopian Telecom structure)
INSERT INTO public.departments (name, name_am, level, description) VALUES
('Executive Management', 'የአስፈፃሚ አመራር', 1, 'CEO and Executive Leadership'),
('Operations Department', 'የክዋኔ ክፍል', 2, 'Operations and Service Delivery'),
('Technology Department', 'የቴክኖሎጂ ክፍል', 2, 'IT and Network Infrastructure'),
('Finance Department', 'የፋይናንስ ክፍል', 2, 'Financial Management'),
('Human Resources', 'የሰው ኃይል አስተዳደር', 2, 'HR and Talent Management'),
('Customer Service', 'የደንበኞች አገልግሎት', 3, 'Customer Support and Relations'),
('Network Engineering', 'የአውታረ መረብ ምህንድስና', 3, 'Network Planning and Engineering'),
('Sales and Marketing', 'ሽያጭና ግብይት', 3, 'Sales Operations and Marketing')
ON CONFLICT (name) DO NOTHING;