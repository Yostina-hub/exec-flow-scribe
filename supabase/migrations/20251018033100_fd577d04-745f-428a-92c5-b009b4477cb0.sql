-- Add ElevenLabs API key to transcription preferences
ALTER TABLE transcription_preferences
ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT;