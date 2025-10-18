-- Create table for Google Drive file associations
CREATE TABLE IF NOT EXISTS public.meeting_drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT NOT NULL,
  drive_file_type TEXT NOT NULL,
  drive_file_url TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  auto_generated BOOLEAN DEFAULT false,
  file_category TEXT, -- 'recording', 'minutes', 'attachment', 'backup'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_meeting_drive_files_meeting_id ON public.meeting_drive_files(meeting_id);
CREATE INDEX idx_meeting_drive_files_category ON public.meeting_drive_files(file_category);
CREATE INDEX idx_meeting_drive_files_uploaded_by ON public.meeting_drive_files(uploaded_by);

-- Enable RLS
ALTER TABLE public.meeting_drive_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view drive files from their meetings"
  ON public.meeting_drive_files
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload drive files to their meetings"
  ON public.meeting_drive_files
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders can update their drive files"
  ON public.meeting_drive_files
  FOR UPDATE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can delete their drive files"
  ON public.meeting_drive_files
  FOR DELETE
  USING (uploaded_by = auth.uid());

-- Create table for Drive sync settings
CREATE TABLE IF NOT EXISTS public.drive_sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  auto_upload_recordings BOOLEAN DEFAULT true,
  auto_save_minutes_as_docs BOOLEAN DEFAULT true,
  auto_backup_enabled BOOLEAN DEFAULT false,
  backup_folder_id TEXT,
  default_folder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.drive_sync_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own drive settings"
  ON public.drive_sync_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_meeting_drive_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_drive_files_updated_at
  BEFORE UPDATE ON public.meeting_drive_files
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_drive_files_updated_at();

CREATE TRIGGER trigger_update_drive_sync_settings_updated_at
  BEFORE UPDATE ON public.drive_sync_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_drive_files_updated_at();