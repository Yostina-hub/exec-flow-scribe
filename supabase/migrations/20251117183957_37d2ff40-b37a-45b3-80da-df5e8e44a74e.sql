-- Remove policy that could cause recursion between meetings and meeting_attendees
DROP POLICY IF EXISTS "Creators can view all attendees" ON public.meeting_attendees;