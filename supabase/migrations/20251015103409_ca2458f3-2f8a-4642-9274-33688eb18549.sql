-- Break RLS recursion by decoupling meeting_attendees SELECT from meetings
-- and splitting creator privileges into granular policies

-- Meeting attendees table: adjust policies
DROP POLICY IF EXISTS "Meeting creators can manage attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Users can view attendees of their meetings" ON public.meeting_attendees;

-- Allow users to view only their own attendee rows (no dependency on meetings)
CREATE POLICY "Users can view their attendee rows"
ON public.meeting_attendees
FOR SELECT
USING (user_id = auth.uid());

-- Meeting creators can insert attendee rows for their meetings
CREATE POLICY "Creators can insert attendees"
ON public.meeting_attendees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.created_by = auth.uid()
  )
);

-- Meeting creators can update attendee rows for their meetings
CREATE POLICY "Creators can update attendees"
ON public.meeting_attendees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.created_by = auth.uid()
  )
);

-- Meeting creators can delete attendee rows for their meetings
CREATE POLICY "Creators can delete attendees"
ON public.meeting_attendees
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.created_by = auth.uid()
  )
);
