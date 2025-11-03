-- Add TeleDrive and notebook sync columns to drive_sync_settings
ALTER TABLE public.drive_sync_settings
ADD COLUMN IF NOT EXISTS google_drive_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS teledrive_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS teledrive_api_host text,
ADD COLUMN IF NOT EXISTS teledrive_access_token text,
ADD COLUMN IF NOT EXISTS auto_sync_notebooks boolean DEFAULT false;

-- Add storage provider column to meeting_drive_files
ALTER TABLE public.meeting_drive_files
ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'google_drive'
CHECK (storage_provider IN ('google_drive', 'teledrive'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meeting_drive_files_storage_provider 
ON public.meeting_drive_files(storage_provider);

COMMENT ON COLUMN public.drive_sync_settings.google_drive_enabled IS 'Enable Google Drive integration';
COMMENT ON COLUMN public.drive_sync_settings.teledrive_enabled IS 'Enable TeleDrive (Telegram) integration';
COMMENT ON COLUMN public.drive_sync_settings.teledrive_api_host IS 'TeleDrive API host URL';
COMMENT ON COLUMN public.drive_sync_settings.teledrive_access_token IS 'TeleDrive access token';
COMMENT ON COLUMN public.drive_sync_settings.auto_sync_notebooks IS 'Automatically sync notebook files to cloud storage';
COMMENT ON COLUMN public.meeting_drive_files.storage_provider IS 'Cloud storage provider (google_drive or teledrive)';