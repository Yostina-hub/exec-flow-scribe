-- ============================================
-- STRICT MEETING ISOLATION: Remove admin overrides
-- Only creators and explicit attendees can access meetings
-- ============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Guests can view upcoming scheduled meetings" ON public.meetings;
DROP POLICY IF EXISTS "auth_select_meetings_window" ON public.meetings;
DROP POLICY IF EXISTS "public_select_meetings_window" ON public.meetings;

-- Update the main SELECT policy to ONLY allow creator and explicit attendees
DROP POLICY IF EXISTS "Users can view own or attending meetings" ON public.meetings;
CREATE POLICY "Strict: Only creators and attendees view meetings"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM meeting_attendees 
      WHERE meeting_attendees.meeting_id = meetings.id 
      AND meeting_attendees.user_id = auth.uid()
    )
  );

-- Ensure signature request access is maintained (but not admin override)
-- This policy already exists, keeping it as is

-- ============================================
-- SPEAKER IDENTIFICATION: Add table for audio-detected speakers
-- Store speaker names as detected from audio introductions
-- ============================================

-- Create table to store speaker identities from audio
CREATE TABLE IF NOT EXISTS public.meeting_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL, -- e.g., "Speaker 1", "Speaker 2" from transcription
  detected_name TEXT, -- Name detected from audio introduction
  user_id UUID, -- Optional: link to user if identified
  confidence_score NUMERIC(3,2), -- Confidence in name detection (0.00-1.00)
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(meeting_id, speaker_label)
);

-- Enable RLS on meeting_speakers
ALTER TABLE public.meeting_speakers ENABLE ROW LEVEL SECURITY;

-- Only meeting participants can view speaker data
CREATE POLICY "Meeting participants can view speakers"
  ON public.meeting_speakers
  FOR SELECT
  TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM meetings 
      WHERE created_by = auth.uid()
    )
    OR meeting_id IN (
      SELECT meeting_id FROM meeting_attendees 
      WHERE user_id = auth.uid()
    )
  );

-- System can insert/update speaker data
CREATE POLICY "System can manage speakers"
  ON public.meeting_speakers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meeting_speakers_meeting_id ON public.meeting_speakers(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_speakers_label ON public.meeting_speakers(meeting_id, speaker_label);

COMMENT ON TABLE public.meeting_speakers IS 'Stores speaker identities detected from audio, not from user profiles';
COMMENT ON COLUMN public.meeting_speakers.detected_name IS 'Name extracted from audio introduction, not from user profile';