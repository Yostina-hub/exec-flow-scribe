-- Create table to track summary quality metrics
CREATE TABLE IF NOT EXISTS public.summary_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES public.meeting_summaries(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  generation_method TEXT NOT NULL CHECK (generation_method IN ('standard', 'template')),
  template_id UUID REFERENCES public.meeting_templates(id) ON DELETE SET NULL,
  summary_type TEXT NOT NULL,
  
  -- Quality indicators
  edit_count INTEGER DEFAULT 0,
  character_changes INTEGER DEFAULT 0,
  time_to_first_edit_seconds INTEGER,
  total_edit_duration_seconds INTEGER DEFAULT 0,
  
  -- User feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback_text TEXT,
  was_regenerated BOOLEAN DEFAULT false,
  regeneration_reason TEXT,
  
  -- Usage metrics
  view_count INTEGER DEFAULT 0,
  copy_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  first_edited_at TIMESTAMP WITH TIME ZONE,
  last_edited_at TIMESTAMP WITH TIME ZONE,
  rated_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX idx_summary_quality_summary_id ON public.summary_quality_metrics(summary_id);
CREATE INDEX idx_summary_quality_meeting_id ON public.summary_quality_metrics(meeting_id);
CREATE INDEX idx_summary_quality_method ON public.summary_quality_metrics(generation_method);
CREATE INDEX idx_summary_quality_template_id ON public.summary_quality_metrics(template_id);
CREATE INDEX idx_summary_quality_rating ON public.summary_quality_metrics(user_rating);
CREATE INDEX idx_summary_quality_created_at ON public.summary_quality_metrics(created_at);

-- Enable RLS
ALTER TABLE public.summary_quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view metrics for their meetings"
ON public.summary_quality_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_attendees ma
    WHERE ma.meeting_id = summary_quality_metrics.meeting_id
    AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage metrics"
ON public.summary_quality_metrics FOR ALL
USING (true)
WITH CHECK (true);

-- Function to automatically create metrics entry when summary is created
CREATE OR REPLACE FUNCTION create_summary_quality_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.summary_quality_metrics (
    summary_id,
    meeting_id,
    generation_method,
    template_id,
    summary_type
  ) VALUES (
    NEW.id,
    NEW.meeting_id,
    COALESCE((NEW.metadata->>'generation_method')::text, 'standard'),
    (NEW.metadata->>'template_id')::uuid,
    NEW.summary_type
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create metrics
CREATE TRIGGER create_summary_quality_metrics_trigger
AFTER INSERT ON public.meeting_summaries
FOR EACH ROW
EXECUTE FUNCTION create_summary_quality_metrics();

-- Create analytics view for comparing methods
CREATE OR REPLACE VIEW public.summary_quality_analytics AS
SELECT 
  generation_method,
  template_id,
  summary_type,
  COUNT(*) as total_summaries,
  AVG(user_rating) as avg_rating,
  AVG(edit_count) as avg_edits,
  AVG(character_changes) as avg_character_changes,
  AVG(time_to_first_edit_seconds) as avg_time_to_first_edit,
  SUM(CASE WHEN was_regenerated THEN 1 ELSE 0 END) as regeneration_count,
  AVG(view_count) as avg_views,
  COUNT(CASE WHEN user_rating IS NOT NULL THEN 1 END) as rated_count,
  COUNT(CASE WHEN user_rating >= 4 THEN 1 END) as positive_ratings,
  COUNT(CASE WHEN user_rating <= 2 THEN 1 END) as negative_ratings
FROM public.summary_quality_metrics
GROUP BY generation_method, template_id, summary_type;

COMMENT ON TABLE public.summary_quality_metrics IS 'Tracks quality metrics for AI-generated summaries to compare standard vs template generation methods';
COMMENT ON VIEW public.summary_quality_analytics IS 'Analytics view comparing quality metrics between standard and template-based generation';