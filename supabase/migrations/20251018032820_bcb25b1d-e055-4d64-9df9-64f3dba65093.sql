-- Add separate API key columns for Whisper and Realtime
ALTER TABLE public.transcription_preferences
ADD COLUMN whisper_api_key TEXT,
ADD COLUMN realtime_api_key TEXT,
ADD COLUMN use_same_key BOOLEAN DEFAULT true;

-- Migrate existing openai_api_key to both if present
UPDATE public.transcription_preferences
SET 
  whisper_api_key = openai_api_key,
  realtime_api_key = openai_api_key
WHERE openai_api_key IS NOT NULL;