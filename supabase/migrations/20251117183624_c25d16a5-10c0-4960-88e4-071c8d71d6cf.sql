-- Fix infinite recursion by using direct JOIN instead of function
-- Drop the problematic policy
DROP POLICY IF EXISTS "Strict: Only creators and attendees view meetings" ON public.meetings;

-- Create policy with direct subquery that won't recurse
CREATE POLICY "Strict: Only creators and attendees view meetings"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR 
    EXISTS (
      SELECT 1 FROM public.meeting_attendees
      WHERE meeting_id = meetings.id AND user_id = auth.uid()
    )
  );

-- Ensure meeting_attendees has simple RLS that doesn't reference meetings
DROP POLICY IF EXISTS "Users can view meetings they attend" ON public.meeting_attendees;
DROP POLICY IF EXISTS "meeting_attendees_select_policy" ON public.meeting_attendees;

CREATE POLICY "Users can view their own attendee records"
  ON public.meeting_attendees
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to view attendee records for meetings they created
CREATE POLICY "Creators can view all attendees"
  ON public.meeting_attendees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );