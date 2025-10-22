-- Add policy to allow guests to view meetings they have approved access to
CREATE POLICY "Approved guests can view meetings"
ON public.meetings
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM public.guest_access_requests 
    WHERE guest_access_requests.meeting_id = meetings.id 
      AND guest_access_requests.user_id = auth.uid()
      AND guest_access_requests.status = 'approved'
  )
);