-- Create notebook intelligence insights table
CREATE TABLE IF NOT EXISTS public.notebook_intelligence_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.notebook_sources(id) ON DELETE CASCADE,
  insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  full_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notebook_intelligence_insights_source_id 
  ON public.notebook_intelligence_insights(source_id);

-- Enable RLS
ALTER TABLE public.notebook_intelligence_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own insights"
  ON public.notebook_intelligence_insights
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notebook_sources
      WHERE notebook_sources.id = notebook_intelligence_insights.source_id
      AND notebook_sources.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own insights"
  ON public.notebook_intelligence_insights
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notebook_sources
      WHERE notebook_sources.id = notebook_intelligence_insights.source_id
      AND notebook_sources.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_notebook_intelligence_insights_updated_at
  BEFORE UPDATE ON public.notebook_intelligence_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();