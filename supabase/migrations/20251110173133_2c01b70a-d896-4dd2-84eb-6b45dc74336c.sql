-- Create table to track minute generation progress
CREATE TABLE IF NOT EXISTS public.minute_generation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'initializing', -- initializing, fetching_data, analyzing, generating, finalizing, completed, failed
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  estimated_completion_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.minute_generation_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own meeting generation progress
CREATE POLICY "Users can view generation progress for their meetings"
  ON public.minute_generation_progress
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE created_by = auth.uid() 
      OR id IN (
        SELECT meeting_id FROM public.meeting_attendees 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create index for faster queries
CREATE INDEX idx_minute_generation_progress_meeting_id 
  ON public.minute_generation_progress(meeting_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.minute_generation_progress;

-- Set replica identity for realtime updates
ALTER TABLE public.minute_generation_progress REPLICA IDENTITY FULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_minute_generation_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_minute_generation_progress_updated_at
  BEFORE UPDATE ON public.minute_generation_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_minute_generation_progress_updated_at();