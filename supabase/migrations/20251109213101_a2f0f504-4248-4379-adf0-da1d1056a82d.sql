-- Create meeting_questions table for live Q&A
CREATE TABLE IF NOT EXISTS meeting_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  answered_by UUID REFERENCES profiles(id),
  answer TEXT,
  answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE meeting_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_questions
CREATE POLICY "Users can view questions for meetings they attend"
  ON meeting_questions
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert questions"
  ON meeting_questions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Participants can update answers"
  ON meeting_questions
  FOR UPDATE
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_questions;