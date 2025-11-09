-- Create distribution_retry_queue table to track retry attempts
CREATE TABLE IF NOT EXISTS public.distribution_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_history_id UUID NOT NULL REFERENCES public.distribution_history(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  failed_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'completed', 'failed')),
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.distribution_retry_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view retry queue for their meetings
CREATE POLICY "Users can view retry queue for their meetings"
  ON public.distribution_retry_queue
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_attendees WHERE user_id = auth.uid()
    )
    OR
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

-- Policy: System can manage retry queue
CREATE POLICY "System can manage retry queue"
  ON public.distribution_retry_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_retry_queue_next_retry ON public.distribution_retry_queue(next_retry_at) 
  WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_retry_queue_meeting_id ON public.distribution_retry_queue(meeting_id);
CREATE INDEX idx_retry_queue_status ON public.distribution_retry_queue(status);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_retry_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_retry_queue_updated_at_trigger
  BEFORE UPDATE ON public.distribution_retry_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_retry_queue_updated_at();