-- Policies for meeting_media to allow authenticated users to upload and view media for meetings they participate in

-- Allow viewing media for meetings where the user is an attendee or the creator
CREATE POLICY "Users can view media from their meetings"
ON public.meeting_media
FOR SELECT
USING (
  meeting_id IN (
    SELECT m.id
    FROM public.meetings m
    WHERE m.created_by = auth.uid()
       OR EXISTS (
         SELECT 1 FROM public.meeting_attendees a
         WHERE a.meeting_id = m.id AND a.user_id = auth.uid()
       )
  )
);

-- Allow inserting media the user uploads for meetings they belong to
CREATE POLICY "Users can upload media to their meetings"
ON public.meeting_media
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid()
  AND meeting_id IN (
    SELECT m.id
    FROM public.meetings m
    WHERE m.created_by = auth.uid()
       OR EXISTS (
         SELECT 1 FROM public.meeting_attendees a
         WHERE a.meeting_id = m.id AND a.user_id = auth.uid()
       )
  )
);
