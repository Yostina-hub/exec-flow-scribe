-- Create approval rules table
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}',
  approver_user_ids UUID[] NOT NULL DEFAULT '{}',
  require_all_approvers BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_approval_rules_active ON public.approval_rules(is_active);
CREATE INDEX idx_approval_rules_priority ON public.approval_rules(priority DESC);

-- Enable RLS
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage approval rules"
  ON public.approval_rules
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view active approval rules"
  ON public.approval_rules
  FOR SELECT
  USING (is_active = true);

-- Add sensitivity_level to meetings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meetings' 
    AND column_name = 'sensitivity_level'
  ) THEN
    ALTER TABLE public.meetings ADD COLUMN sensitivity_level TEXT;
  END IF;
END $$;

-- Create function to match approval rules
CREATE OR REPLACE FUNCTION public.match_approval_rules(
  p_meeting_id UUID
)
RETURNS TABLE(
  rule_id UUID,
  rule_name TEXT,
  approver_ids UUID[],
  require_all BOOLEAN,
  priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meeting RECORD;
BEGIN
  -- Get meeting details
  SELECT 
    m.meeting_type,
    m.sensitivity_level,
    m.department_id
  INTO v_meeting
  FROM meetings m
  WHERE m.id = p_meeting_id;

  -- Return matching rules ordered by priority
  RETURN QUERY
  SELECT 
    ar.id,
    ar.rule_name,
    ar.approver_user_ids,
    ar.require_all_approvers,
    ar.priority
  FROM approval_rules ar
  WHERE ar.is_active = true
    AND (
      -- Match meeting type if specified
      (ar.conditions->>'meeting_type' IS NULL OR ar.conditions->>'meeting_type' = v_meeting.meeting_type)
      -- Match sensitivity level if specified
      AND (ar.conditions->>'sensitivity_level' IS NULL OR ar.conditions->>'sensitivity_level' = v_meeting.sensitivity_level)
      -- Match department if specified
      AND (ar.conditions->>'department_id' IS NULL OR (ar.conditions->>'department_id')::UUID = v_meeting.department_id)
    )
  ORDER BY ar.priority DESC, ar.created_at ASC;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_approval_rules_updated_at
  BEFORE UPDATE ON public.approval_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();