-- Create storage bucket for meeting audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-audio',
  'meeting-audio',
  false,
  104857600, -- 100MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
);

-- Create RLS policies for meeting audio bucket
CREATE POLICY "Users can upload audio for their meetings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-audio' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM meetings m
    INNER JOIN meeting_attendees ma ON ma.meeting_id = m.id
    WHERE ma.user_id = auth.uid()
    AND m.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Users can view audio from their meetings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'meeting-audio' AND
  EXISTS (
    SELECT 1 FROM meetings m
    INNER JOIN meeting_attendees ma ON ma.meeting_id = m.id
    WHERE ma.user_id = auth.uid()
    AND m.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Users can delete audio from meetings they created"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'meeting-audio' AND
  EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.created_by = auth.uid()
    AND m.id::text = (storage.foldername(name))[2]
  )
);