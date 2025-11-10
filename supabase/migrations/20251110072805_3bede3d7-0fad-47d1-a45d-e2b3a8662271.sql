-- Helper to safely check if a user participates in a meeting (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_meeting_participant(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = _meeting_id AND m.created_by = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.meeting_attendees ma
    WHERE ma.meeting_id = _meeting_id AND ma.user_id = _user_id
  );
$$;

-- Allow participants and creators to view ALL attendees for their meeting
DROP POLICY IF EXISTS "Participants can view attendees" ON public.meeting_attendees;
CREATE POLICY "Participants can view attendees"
ON public.meeting_attendees
FOR SELECT
USING (
  public.is_meeting_participant(auth.uid(), meeting_id)
);
