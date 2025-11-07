-- Create speaker emotional profiles table
CREATE TABLE IF NOT EXISTS public.speaker_emotional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_count integer DEFAULT 0,
  dominant_emotion text,
  average_sentiment numeric(3,2),
  average_energy numeric(3,2),
  emotional_stability numeric(3,2), -- variance in emotions
  emotion_distribution jsonb DEFAULT '{}'::jsonb, -- frequency of each emotion
  sentiment_trend jsonb DEFAULT '[]'::jsonb, -- historical sentiment over meetings
  last_analyzed_meeting_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_speaker_profiles_user ON public.speaker_emotional_profiles(user_id);
CREATE INDEX idx_speaker_profiles_updated ON public.speaker_emotional_profiles(updated_at DESC);

-- Enable RLS
ALTER TABLE public.speaker_emotional_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own emotional profile"
  ON public.speaker_emotional_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Meeting participants can view each other's profiles
CREATE POLICY "Meeting participants can view other profiles"
  ON public.speaker_emotional_profiles
  FOR SELECT
  USING (
    user_id IN (
      SELECT ma.user_id
      FROM meeting_attendees ma
      WHERE ma.meeting_id IN (
        SELECT meeting_id
        FROM meeting_attendees
        WHERE user_id = auth.uid()
      )
    )
  );

-- System can manage profiles
CREATE POLICY "System can manage emotional profiles"
  ON public.speaker_emotional_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_speaker_profiles_updated_at
  BEFORE UPDATE ON public.speaker_emotional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();