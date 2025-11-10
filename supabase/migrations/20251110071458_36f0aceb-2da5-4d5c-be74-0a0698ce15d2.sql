-- Allow users to view meetings if they have related signature requests (assigned/requested)
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

-- Ensure admins can view all meetings
DROP POLICY IF EXISTS "Admins can view all meetings" ON public.meetings;
CREATE POLICY "Admins can view all meetings"
ON public.meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND lower(r.name) = 'admin'
  )
);