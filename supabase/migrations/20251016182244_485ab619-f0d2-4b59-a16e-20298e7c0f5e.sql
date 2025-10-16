-- Add notification_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "meeting_reminders": true,
  "action_item_updates": true,
  "minutes_ready": true,
  "daily_digest": false,
  "reminder_timing": 15
}'::jsonb;