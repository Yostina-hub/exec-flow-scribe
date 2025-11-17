-- Fix infinite recursion in meeting RLS policy
-- Use existing is_attendee() SECURITY DEFINER function to break recursion

DROP POLICY IF EXISTS "Strict: Only creators and attendees view meetings" ON public.meetings;

CREATE POLICY "Strict: Only creators and attendees view meetings"
  ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    is_attendee(id, auth.uid())
  );