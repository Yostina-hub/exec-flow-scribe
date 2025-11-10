-- Create comments table for executive insights
CREATE TABLE IF NOT EXISTS public.notebook_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid NOT NULL REFERENCES public.notebook_intelligence_insights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notebook_comments ENABLE ROW LEVEL SECURITY;

-- Policies: anyone authenticated can read; only owners can modify
CREATE POLICY "Comments are viewable by authenticated users"
ON public.notebook_comments
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own comments"
ON public.notebook_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.notebook_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.notebook_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_notebook_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_notebook_comments_updated_at ON public.notebook_comments;
CREATE TRIGGER trg_update_notebook_comments_updated_at
BEFORE UPDATE ON public.notebook_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_notebook_comments_updated_at();