-- Allow meeting creators to upload and view audio in meeting-audio bucket

-- INSERT policy for creators
CREATE POLICY "Creators can upload audio for their meetings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-audio'
  AND EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.created_by = auth.uid()
      AND (m.id)::text = (storage.foldername(objects.name))[2]
  )
);

-- SELECT policy for creators
CREATE POLICY "Creators can view audio from their meetings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND EXISTS (
    SELECT 1 FROM meetings m
    WHERE m.created_by = auth.uid()
      AND (m.id)::text = (storage.foldername(objects.name))[2]
  )
);
