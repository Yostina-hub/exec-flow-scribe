-- Add language column to transcription_preferences table
ALTER TABLE transcription_preferences 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'auto';