-- Add new meeting types for modern architecture
-- Note: This only adds the enum values, existing meetings keep their current types
ALTER TYPE meeting_type ADD VALUE IF NOT EXISTS 'video_conference';
ALTER TYPE meeting_type ADD VALUE IF NOT EXISTS 'virtual_room';
ALTER TYPE meeting_type ADD VALUE IF NOT EXISTS 'standard';

-- Add comment to document the types
COMMENT ON COLUMN meetings.meeting_type IS 'Meeting type: video_conference (external video platforms), virtual_room (3D immersive experience), standard (in-person or async). Legacy values: online, hybrid, in_person';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type);