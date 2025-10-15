-- Fix infinite recursion in meeting_attendees RLS policy
DROP POLICY IF EXISTS "Users can view attendees of their meetings" ON meeting_attendees;

CREATE POLICY "Users can view attendees of their meetings" 
ON meeting_attendees 
FOR SELECT 
USING (
  meeting_id IN (
    SELECT id FROM meetings 
    WHERE created_by = auth.uid()
  )
  OR user_id = auth.uid()
);