-- Create distribution_history table to track all email distributions
CREATE TABLE IF NOT EXISTS public.distribution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  distribution_schedule_id UUID REFERENCES public.distribution_schedules(id) ON DELETE SET NULL,
  pdf_generation_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  total_recipients INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  recipient_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('manual', 'scheduled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.distribution_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view distribution history for their meetings
CREATE POLICY "Users can view distribution history for their meetings"
  ON public.distribution_history
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

-- Policy: System can insert distribution history
CREATE POLICY "System can insert distribution history"
  ON public.distribution_history
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_distribution_history_meeting_id ON public.distribution_history(meeting_id);
CREATE INDEX idx_distribution_history_sent_at ON public.distribution_history(sent_at DESC);