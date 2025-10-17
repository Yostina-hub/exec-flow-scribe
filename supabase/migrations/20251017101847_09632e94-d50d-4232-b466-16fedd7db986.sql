-- Create table for meeting chat messages
CREATE TABLE IF NOT EXISTS meeting_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for studio outputs (audio, reports, etc.)
CREATE TABLE IF NOT EXISTS studio_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL CHECK (output_type IN ('audio_overview', 'mind_map', 'report', 'flashcard', 'quiz')),
  content JSONB NOT NULL,
  file_url TEXT,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for meeting sources/attachments
CREATE TABLE IF NOT EXISTS meeting_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('document', 'link', 'transcript', 'media', 'decision', 'action')),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE meeting_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_chat_messages
CREATE POLICY "Users can view chat for their meetings"
  ON meeting_chat_messages FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chat for their meetings"
  ON meeting_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for studio_outputs
CREATE POLICY "Users can view studio outputs for their meetings"
  ON studio_outputs FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create studio outputs for their meetings"
  ON studio_outputs FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for meeting_sources
CREATE POLICY "Users can view sources for their meetings"
  ON meeting_sources FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload sources for their meetings"
  ON meeting_sources FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_meeting_chat_messages_meeting_id ON meeting_chat_messages(meeting_id);
CREATE INDEX idx_meeting_chat_messages_created_at ON meeting_chat_messages(created_at);
CREATE INDEX idx_studio_outputs_meeting_id ON studio_outputs(meeting_id);
CREATE INDEX idx_meeting_sources_meeting_id ON meeting_sources(meeting_id);