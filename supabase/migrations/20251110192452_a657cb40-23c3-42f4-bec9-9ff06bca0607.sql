-- Create table for storing minute translations
CREATE TABLE IF NOT EXISTS public.minute_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  language VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(meeting_id, language)
);

-- Add index for faster lookups
CREATE INDEX idx_minute_translations_meeting_id ON public.minute_translations(meeting_id);
CREATE INDEX idx_minute_translations_language ON public.minute_translations(language);

-- Enable RLS
ALTER TABLE public.minute_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view translations for meetings they can access"
  ON public.minute_translations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = minute_translations.meeting_id
      AND (
        m.created_by = auth.uid()
        OR m.id IN (
          SELECT meeting_id FROM public.meeting_attendees
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert translations for their meetings"
  ON public.minute_translations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = minute_translations.meeting_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update translations for their meetings"
  ON public.minute_translations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = minute_translations.meeting_id
      AND m.created_by = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_minute_translations_updated_at
  BEFORE UPDATE ON public.minute_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.minute_translations;