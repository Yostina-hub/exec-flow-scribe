-- Allow guests to view all upcoming scheduled meetings (for request access feature)
CREATE POLICY "Guests can view upcoming scheduled meetings"
ON meetings
FOR SELECT
TO authenticated
USING (
  status = 'scheduled' 
  AND start_time >= now()
  AND start_time <= (now() + interval '30 days')
);
