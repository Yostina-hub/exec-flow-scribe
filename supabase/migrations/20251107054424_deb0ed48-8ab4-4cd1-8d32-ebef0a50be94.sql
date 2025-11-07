-- Create task templates table
CREATE TABLE IF NOT EXISTS guba_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  -- Template data structure:
  -- {
  --   "title": "string",
  --   "description": "string",
  --   "priority": "low|medium|high",
  --   "default_due_days": number,
  --   "category": "string"
  -- }
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE guba_task_templates ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their own templates and shared templates
CREATE POLICY "Users can view own and shared templates"
  ON guba_task_templates
  FOR SELECT
  USING (
    created_by = auth.uid() OR is_shared = true
  );

-- Users can create their own templates
CREATE POLICY "Users can create templates"
  ON guba_task_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON guba_task_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON guba_task_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- Create indexes
CREATE INDEX idx_guba_task_templates_created_by ON guba_task_templates(created_by);
CREATE INDEX idx_guba_task_templates_is_shared ON guba_task_templates(is_shared);
CREATE INDEX idx_guba_task_templates_use_count ON guba_task_templates(use_count DESC);

-- Create updated_at trigger
CREATE TRIGGER update_guba_task_templates_updated_at
  BEFORE UPDATE ON guba_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();