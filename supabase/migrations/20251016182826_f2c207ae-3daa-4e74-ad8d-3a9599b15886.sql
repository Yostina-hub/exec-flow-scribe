-- Add recording_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS recording_preferences jsonb DEFAULT '{
  "audio_quality": "high",
  "transcription_language": "en",
  "auto_start_recording": false,
  "speaker_diarization": true,
  "auto_generate_summary": true
}'::jsonb;