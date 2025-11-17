-- Clean up duplicate RLS policies on meeting_media
DROP POLICY IF EXISTS "Users can upload media to their meetings" ON public.meeting_media;

-- Ensure storage bucket policies exist for meeting-audio bucket
-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can upload to meeting-audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can read meeting-audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their meeting-audio" ON storage.objects;

-- Allow authenticated users to upload to their meeting folders
CREATE POLICY "Users can upload to meeting-audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-audio'
  AND (storage.foldername(name))[1] IN (
    -- Get all meeting IDs where user is creator or attendee
    SELECT m.id::text
    FROM public.meetings m
    WHERE m.created_by = auth.uid()
    
    UNION
    
    SELECT ma.meeting_id::text
    FROM public.meeting_attendees ma
    WHERE ma.user_id = auth.uid()
  )
);

-- Allow users to read audio from meetings they have access to
CREATE POLICY "Users can read meeting-audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT m.id::text
      FROM public.meetings m
      WHERE m.created_by = auth.uid()
      
      UNION
      
      SELECT ma.meeting_id::text
      FROM public.meeting_attendees ma
      WHERE ma.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  )
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their meeting-audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT m.id::text
      FROM public.meetings m
      WHERE m.created_by = auth.uid()
    )
    OR public.is_admin(auth.uid())
  )
);