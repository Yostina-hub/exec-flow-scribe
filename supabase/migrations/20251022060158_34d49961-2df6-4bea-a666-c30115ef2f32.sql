-- Create meeting_resources table for media management
CREATE TABLE IF NOT EXISTS public.meeting_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('presentation', 'video', 'image', 'document')),
  url TEXT NOT NULL,
  description TEXT,
  file_size BIGINT,
  file_type TEXT,
  is_presenting BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view resources for meetings they attend"
  ON public.meeting_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_attendees
      WHERE meeting_attendees.meeting_id = meeting_resources.meeting_id
      AND meeting_attendees.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can manage resources"
  ON public.meeting_resources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_attendees
      WHERE meeting_attendees.meeting_id = meeting_resources.meeting_id
      AND meeting_attendees.user_id = auth.uid()
      AND meeting_attendees.role IN ('host', 'co-host')
    )
  );

-- Create storage bucket for meeting media
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-media', 'meeting-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view meeting media"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'meeting-media');

CREATE POLICY "Authenticated users can upload meeting media"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'meeting-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their uploaded media"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'meeting-media'
    AND auth.role() = 'authenticated'
  );

-- Enable realtime for meeting_resources
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_resources;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_meeting_resources_meeting_id ON public.meeting_resources(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_resources_presenting ON public.meeting_resources(meeting_id, is_presenting) WHERE is_presenting = true;