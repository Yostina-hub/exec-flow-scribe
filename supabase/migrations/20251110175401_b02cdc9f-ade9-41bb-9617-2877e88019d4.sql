-- Create table for storing incremental minute chunks
CREATE TABLE IF NOT EXISTS public.minute_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  start_time INTEGER NOT NULL, -- seconds from meeting start
  end_time INTEGER NOT NULL, -- seconds from meeting start
  transcription_text TEXT,
  summary TEXT,
  key_points TEXT[],
  decisions TEXT[],
  action_items TEXT[],
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(meeting_id, chunk_number)
);

-- Enable RLS
ALTER TABLE public.minute_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies - simplified to check meeting access
CREATE POLICY "Users can view chunks of meetings they created"
  ON public.minute_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = minute_chunks.meeting_id
      AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert minute chunks"
  ON public.minute_chunks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update minute chunks"
  ON public.minute_chunks FOR UPDATE
  USING (true);

-- Index for faster queries
CREATE INDEX idx_minute_chunks_meeting_id ON public.minute_chunks(meeting_id);
CREATE INDEX idx_minute_chunks_meeting_chunk ON public.minute_chunks(meeting_id, chunk_number);