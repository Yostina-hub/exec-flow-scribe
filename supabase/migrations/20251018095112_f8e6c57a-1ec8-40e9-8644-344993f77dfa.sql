-- Add meeting type and video conference support
DO $$ 
BEGIN
  -- Create meeting type enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
    CREATE TYPE meeting_type AS ENUM ('online', 'in_person', 'hybrid');
  END IF;

  -- Create video provider enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_provider') THEN
    CREATE TYPE video_provider AS ENUM ('google_meet', 'jitsi_meet', 'zoom', 'teams', 'other');
  END IF;
END $$;

-- Add new columns to meetings table
ALTER TABLE meetings 
  ADD COLUMN IF NOT EXISTS meeting_type meeting_type DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS video_conference_url text,
  ADD COLUMN IF NOT EXISTS video_provider video_provider,
  ADD COLUMN IF NOT EXISTS requires_offline_support boolean DEFAULT false;

-- Add index for meeting type queries
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_type ON meetings(meeting_type);

-- Add comments for documentation
COMMENT ON COLUMN meetings.meeting_type IS 'Type of meeting: online, in-person, or hybrid';
COMMENT ON COLUMN meetings.video_conference_url IS 'URL for video conference (Google Meet, Jitsi, etc.)';
COMMENT ON COLUMN meetings.video_provider IS 'Video conferencing provider being used';
COMMENT ON COLUMN meetings.requires_offline_support IS 'Whether this meeting needs offline recording capability';