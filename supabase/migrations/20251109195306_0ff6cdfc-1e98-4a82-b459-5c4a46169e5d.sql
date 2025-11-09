-- Create distribution_schedules table
CREATE TABLE IF NOT EXISTS public.distribution_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring')),
  scheduled_time TIMESTAMPTZ,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  recurrence_day INTEGER CHECK (recurrence_day BETWEEN 0 AND 6),
  enabled BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.distribution_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedules for their meetings"
  ON public.distribution_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = distribution_schedules.meeting_id
      AND (m.created_by = auth.uid() OR public.is_attendee(m.id, auth.uid()))
    )
  );

CREATE POLICY "Meeting creators can manage schedules"
  ON public.distribution_schedules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = distribution_schedules.meeting_id
      AND m.created_by = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_distribution_schedules_updated_at
  BEFORE UPDATE ON public.distribution_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for scheduled queries
CREATE INDEX idx_distribution_schedules_next_send ON public.distribution_schedules(next_send_at, enabled) WHERE enabled = true;