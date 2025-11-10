-- Restore meeting visibility for users involved in signature requests
DROP POLICY IF EXISTS "Users can view meetings for their signature requests" ON public.meetings;
CREATE POLICY "Users can view meetings for their signature requests"
ON public.meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.signature_requests sr
    WHERE sr.meeting_id = meetings.id
      AND (sr.assigned_to = auth.uid() OR sr.requested_by = auth.uid())
  )
);