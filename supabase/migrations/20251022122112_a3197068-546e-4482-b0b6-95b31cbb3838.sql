-- Fix attendee visibility and self-join in meetings
-- Allow participants to insert their own attendee row for active/scheduled meetings
CREATE POLICY "Attendees can insert themselves"
ON public.meeting_attendees
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendees.meeting_id
      AND m.status IN ('scheduled','in_progress')
  )
);

-- Allow participants to view ALL attendees of meetings they are part of
CREATE POLICY "Participants can view attendees of meetings they joined"
ON public.meeting_attendees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_attendees ma
    WHERE ma.meeting_id = meeting_attendees.meeting_id
      AND ma.user_id = auth.uid()
  )
);

-- Allow participants to update their own attendee row (hand raise, attended, etc.)
CREATE POLICY "Attendees can update their own row"
ON public.meeting_attendees
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure realtime delete/update payloads include full row
ALTER TABLE public.meeting_attendees REPLICA IDENTITY FULL;