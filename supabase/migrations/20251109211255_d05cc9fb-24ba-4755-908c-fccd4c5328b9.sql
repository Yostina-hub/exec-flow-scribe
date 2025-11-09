-- Create advisor conversations table to track sessions
CREATE TABLE advisor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  session_summary TEXT,
  key_insights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create advisor messages table to store conversation messages
CREATE TABLE advisor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_advisor_conversations_meeting_id ON advisor_conversations(meeting_id);
CREATE INDEX idx_advisor_conversations_user_id ON advisor_conversations(user_id);
CREATE INDEX idx_advisor_messages_conversation_id ON advisor_messages(conversation_id);
CREATE INDEX idx_advisor_messages_timestamp ON advisor_messages(timestamp);

-- Enable RLS
ALTER TABLE advisor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advisor_conversations
CREATE POLICY "Users can view their own advisor conversations"
  ON advisor_conversations
  FOR SELECT
  USING (user_id = auth.uid() OR meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create advisor conversations"
  ON advisor_conversations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own advisor conversations"
  ON advisor_conversations
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for advisor_messages
CREATE POLICY "Users can view messages from their conversations"
  ON advisor_messages
  FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM advisor_conversations 
    WHERE user_id = auth.uid() OR meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create messages in their conversations"
  ON advisor_messages
  FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM advisor_conversations WHERE user_id = auth.uid()
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advisor_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER advisor_conversations_updated_at
  BEFORE UPDATE ON advisor_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_advisor_conversation_updated_at();

-- Add realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE advisor_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE advisor_messages;