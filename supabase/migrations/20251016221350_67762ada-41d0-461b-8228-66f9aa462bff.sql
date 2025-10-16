-- Create recurrence_rules table for recurring meetings
CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  month_of_year INTEGER CHECK (month_of_year >= 1 AND month_of_year <= 12),
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

-- Users can view recurrence rules for their meetings
CREATE POLICY "Users can view recurrence rules for their meetings"
  ON public.recurrence_rules
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT m.id FROM public.meetings m
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees WHERE meeting_id = m.id
      )
    )
  );

-- Meeting creators can manage recurrence rules
CREATE POLICY "Meeting creators can manage recurrence rules"
  ON public.recurrence_rules
  FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX idx_recurrence_rules_meeting_id ON public.recurrence_rules(meeting_id);

-- Add trigger for updated_at
CREATE TRIGGER update_recurrence_rules_updated_at
  BEFORE UPDATE ON public.recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();