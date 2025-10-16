-- Add meeting_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS meeting_preferences jsonb DEFAULT '{
  "default_duration": 60,
  "default_location": "Board Room",
  "calendar_sync": "google",
  "auto_schedule_followup": false,
  "enable_virtual_links": true
}'::jsonb;