-- Add AI suggestion field to meeting_questions table
ALTER TABLE meeting_questions
ADD COLUMN IF NOT EXISTS ai_suggestion TEXT,
ADD COLUMN IF NOT EXISTS ai_suggestion_confidence DECIMAL(3,2);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_meeting_questions_meeting_unanswered 
ON meeting_questions(meeting_id, answered_at) 
WHERE answered_at IS NULL;