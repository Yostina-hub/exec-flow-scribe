-- Allow guests to see only meetings starting within next 2 hours
-- without exposing past or far-future meetings

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous users (pre-signup guests)
CREATE POLICY public_select_meetings_next_2h
ON public.meetings
FOR SELECT
TO anon
USING (
  start_time >= now() AND start_time <= (now() + interval '2 hours')
);

-- Policy for authenticated users (after signup but before approval)
CREATE POLICY auth_select_meetings_next_2h
ON public.meetings
FOR SELECT
TO authenticated
USING (
  start_time >= now() AND start_time <= (now() + interval '2 hours')
);
