-- Update RLS policies on signature_requests to ensure correct visibility
-- 1) Drop the recently added policy to replace with combined, comprehensive policies
DROP POLICY IF EXISTS "Users can view signature requests for their meetings" ON public.signature_requests;

-- 2) Keep the original behavior: assignee or requester can view
CREATE POLICY "Assignees and requesters can view signature requests"
ON public.signature_requests
FOR SELECT
USING (
  assigned_to = auth.uid() OR requested_by = auth.uid()
);

-- 3) Meeting creators and attendees can view
CREATE POLICY "Meeting participants can view signature requests"
ON public.signature_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.meetings m
    LEFT JOIN public.meeting_attendees ma ON ma.meeting_id = m.id
    WHERE m.id = meeting_id
      AND (m.created_by = auth.uid() OR ma.user_id = auth.uid())
  )
);

-- 4) Admins can view all signature requests
CREATE POLICY "Admins can view all signature requests"
ON public.signature_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND lower(r.name) = 'admin'
  )
);
