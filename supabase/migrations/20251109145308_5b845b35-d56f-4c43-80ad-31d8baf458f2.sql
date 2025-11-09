-- Create meeting_chapters table for real-time chapter detection
CREATE TABLE IF NOT EXISTS public.meeting_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  timestamp INTERVAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('intro', 'discussion', 'decision', 'action', 'conclusion')),
  start_transcription_id UUID REFERENCES public.transcriptions(id),
  confidence_score DECIMAL(3,2) DEFAULT 0.85,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view chapters for meetings they created or are attending
CREATE POLICY "Users can view chapters for their meetings"
  ON public.meeting_chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_chapters.meeting_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert chapters"
  ON public.meeting_chapters FOR INSERT
  WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX idx_meeting_chapters_meeting_id ON public.meeting_chapters(meeting_id);
CREATE INDEX idx_meeting_chapters_timestamp ON public.meeting_chapters(meeting_id, timestamp);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_chapters;