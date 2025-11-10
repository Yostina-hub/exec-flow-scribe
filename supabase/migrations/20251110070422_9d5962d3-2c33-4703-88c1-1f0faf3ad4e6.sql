-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view signature requests assigned to them" ON signature_requests;

-- Create a new policy that allows users to see signature requests for meetings they have access to
CREATE POLICY "Users can view signature requests for their meetings"
ON signature_requests
FOR SELECT
USING (
  meeting_id IN (
    SELECT m.id 
    FROM meetings m
    LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id
    WHERE m.created_by = auth.uid() 
       OR ma.user_id = auth.uid()
  )
);