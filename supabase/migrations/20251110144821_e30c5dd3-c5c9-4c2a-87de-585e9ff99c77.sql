-- Add public sharing fields to meeting_templates
ALTER TABLE meeting_templates
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS shared_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Create index for public templates
CREATE INDEX IF NOT EXISTS idx_meeting_templates_public 
ON meeting_templates(is_public, category) 
WHERE is_public = true;

-- Update RLS policy to allow viewing public templates
DROP POLICY IF EXISTS "Users can view public templates" ON meeting_templates;
CREATE POLICY "Users can view public templates"
ON meeting_templates FOR SELECT
USING (is_public = true OR created_by = auth.uid());

-- Policy to allow sharing templates
DROP POLICY IF EXISTS "Users can update their own templates" ON meeting_templates;
CREATE POLICY "Users can update their own templates"
ON meeting_templates FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());