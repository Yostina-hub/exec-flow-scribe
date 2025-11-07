-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for semantic embeddings
CREATE TABLE IF NOT EXISTS public.transcription_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  embedding vector(1536),
  content TEXT NOT NULL,
  speaker_name TEXT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS transcription_embeddings_vector_idx 
ON public.transcription_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS transcription_embeddings_meeting_idx 
ON public.transcription_embeddings(meeting_id);

CREATE INDEX IF NOT EXISTS transcription_embeddings_transcription_idx 
ON public.transcription_embeddings(transcription_id);

-- Create table for AI-generated meeting summaries
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('live', 'final', 'tone_shift', 'key_moment')),
  content TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for summaries
CREATE INDEX IF NOT EXISTS meeting_summaries_meeting_idx 
ON public.meeting_summaries(meeting_id);

CREATE INDEX IF NOT EXISTS meeting_summaries_type_idx 
ON public.meeting_summaries(summary_type);

-- Enable RLS
ALTER TABLE public.transcription_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for embeddings
CREATE POLICY "Users can view embeddings for meetings they attend"
ON public.transcription_embeddings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_attendees ma
    WHERE ma.meeting_id = transcription_embeddings.meeting_id
    AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert embeddings"
ON public.transcription_embeddings FOR INSERT
WITH CHECK (true);

-- RLS Policies for summaries
CREATE POLICY "Users can view summaries for meetings they attend"
ON public.meeting_summaries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_attendees ma
    WHERE ma.meeting_id = meeting_summaries.meeting_id
    AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage summaries"
ON public.meeting_summaries FOR ALL
USING (true)
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meeting_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_meeting_summaries_updated_at
BEFORE UPDATE ON public.meeting_summaries
FOR EACH ROW
EXECUTE FUNCTION update_meeting_summaries_updated_at();