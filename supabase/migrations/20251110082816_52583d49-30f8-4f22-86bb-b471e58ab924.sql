-- Add secretary workflow fields to notebook_sources
ALTER TABLE public.notebook_sources
ADD COLUMN IF NOT EXISTS secretary_notes TEXT,
ADD COLUMN IF NOT EXISTS priority_level TEXT CHECK (priority_level IN ('urgent', 'high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS submitted_for UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS submission_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notebook_sources_submitted_for ON public.notebook_sources(submitted_for);
CREATE INDEX IF NOT EXISTS idx_notebook_sources_priority ON public.notebook_sources(priority_level);

-- Update RLS policies to allow secretaries to submit documents
CREATE POLICY "Secretaries can insert sources for executives"
ON public.notebook_sources
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

-- Allow executives to view sources submitted to them
CREATE POLICY "Users can view sources submitted to them"
ON public.notebook_sources
FOR SELECT
TO authenticated
USING (submitted_for = auth.uid() OR user_id = auth.uid());

-- Create notification table for document submissions
CREATE TABLE IF NOT EXISTS public.document_submission_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.notebook_sources(id) ON DELETE CASCADE,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_for UUID REFERENCES auth.users(id),
  priority_level TEXT,
  secretary_notes TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.document_submission_notifications ENABLE ROW LEVEL SECURITY;

-- Executives can view their notifications
CREATE POLICY "Users can view their notifications"
ON public.document_submission_notifications
FOR SELECT
TO authenticated
USING (submitted_for = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their notifications"
ON public.document_submission_notifications
FOR UPDATE
TO authenticated
USING (submitted_for = auth.uid());

-- Trigger to create notification when document is submitted
CREATE OR REPLACE FUNCTION notify_document_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create notification if submitted_for is set
  IF NEW.submitted_for IS NOT NULL THEN
    INSERT INTO public.document_submission_notifications (
      source_id,
      notebook_id,
      submitted_by,
      submitted_for,
      priority_level,
      secretary_notes
    ) VALUES (
      NEW.id,
      NEW.notebook_id,
      NEW.submitted_by,
      NEW.submitted_for,
      NEW.priority_level,
      NEW.secretary_notes
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_document_submitted
  AFTER INSERT ON public.notebook_sources
  FOR EACH ROW
  WHEN (NEW.submitted_for IS NOT NULL)
  EXECUTE FUNCTION notify_document_submission();

-- Add trigger for updated_at
CREATE TRIGGER update_document_notifications_updated_at
  BEFORE UPDATE ON public.document_submission_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();