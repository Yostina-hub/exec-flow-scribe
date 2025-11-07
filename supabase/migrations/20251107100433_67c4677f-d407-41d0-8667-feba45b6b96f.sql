-- Create emotional_analysis table
CREATE TABLE IF NOT EXISTS public.emotional_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_name TEXT,
  primary_emotion TEXT NOT NULL,
  emotion_score DECIMAL(3,2) NOT NULL CHECK (emotion_score >= 0 AND emotion_score <= 1),
  secondary_emotions JSONB,
  sentiment TEXT,
  energy_level TEXT,
  confidence DECIMAL(3,2),
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_emotional_analysis_transcription ON public.emotional_analysis(transcription_id);
CREATE INDEX IF NOT EXISTS idx_emotional_analysis_meeting ON public.emotional_analysis(meeting_id);
CREATE INDEX IF NOT EXISTS idx_emotional_analysis_speaker ON public.emotional_analysis(speaker_name);

-- Enable RLS
ALTER TABLE public.emotional_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view emotional analysis for their meetings"
  ON public.emotional_analysis FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert emotional analysis"
  ON public.emotional_analysis FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.emotional_analysis;