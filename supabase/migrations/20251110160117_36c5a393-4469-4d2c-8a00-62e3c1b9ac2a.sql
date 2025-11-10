-- Add metadata column to meeting_summaries for storing template info
ALTER TABLE public.meeting_summaries
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on metadata for faster queries
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_metadata 
ON public.meeting_summaries USING gin(metadata);

-- Add comment for documentation
COMMENT ON COLUMN public.meeting_summaries.metadata IS 'Stores generation metadata including generation_method (standard/template) and template_id';