-- Add language column to transcriptions table if it doesn't exist
ALTER TABLE transcriptions 
ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT 'auto';

-- Add index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_transcriptions_language 
ON transcriptions(detected_language);

-- Add comment
COMMENT ON COLUMN transcriptions.detected_language IS 'Auto-detected language of the transcription (ISO 639-1 code or "auto")';
