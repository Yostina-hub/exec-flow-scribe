-- Update the transcription_preferences table to allow "browser" as a valid provider
ALTER TABLE public.transcription_preferences
DROP CONSTRAINT IF EXISTS transcription_preferences_provider_check;

ALTER TABLE public.transcription_preferences
ADD CONSTRAINT transcription_preferences_provider_check
CHECK (provider IN ('lovable_ai', 'openai', 'browser'));