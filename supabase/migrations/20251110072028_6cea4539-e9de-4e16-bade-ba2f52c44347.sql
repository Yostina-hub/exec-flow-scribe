-- Create a SECURITY DEFINER helper to avoid recursive RLS when checking meeting access
CREATE OR REPLACE FUNCTION public.can_view_meeting_sr(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meetings m
    LEFT JOIN public.meeting_attendees ma ON ma.meeting_id = m.id
    WHERE m.id = _meeting_id
      AND (m.created_by = _user_id OR ma.user_id = _user_id)
  );
$$;

-- Recreate signature_requests SELECT policies using the helper to prevent recursive RLS
DROP POLICY IF EXISTS "Assignees and requesters can view signature requests" ON public.signature_requests;
CREATE POLICY "Assignees and requesters can view signature requests"
ON public.signature_requests
FOR SELECT
USING (
  assigned_to = auth.uid() OR requested_by = auth.uid()
);

DROP POLICY IF EXISTS "Meeting participants can view signature requests" ON public.signature_requests;
CREATE POLICY "Meeting participants can view signature requests"
ON public.signature_requests
FOR SELECT
USING (
  public.can_view_meeting_sr(auth.uid(), meeting_id)
);

DROP POLICY IF EXISTS "Admins can view all signature requests" ON public.signature_requests;
CREATE POLICY "Admins can view all signature requests"
ON public.signature_requests
FOR SELECT
USING (
  public.is_admin(auth.uid())
);