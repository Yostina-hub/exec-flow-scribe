-- Drop old restrictive policies
DROP POLICY IF EXISTS public_select_meetings_next_2h ON public.meetings;
DROP POLICY IF EXISTS auth_select_meetings_next_2h ON public.meetings;

-- Policy for anonymous users (pre-signup guests)
-- Allow viewing meetings from 20min ago to 2h ahead
CREATE POLICY public_select_meetings_window
ON public.meetings
FOR SELECT
TO anon
USING (
  start_time >= (now() - interval '20 minutes') 
  AND start_time <= (now() + interval '2 hours')
);

-- Policy for authenticated users (after signup but before approval)
-- Allow viewing meetings from 20min ago to 2h ahead
CREATE POLICY auth_select_meetings_window
ON public.meetings
FOR SELECT
TO authenticated
USING (
  start_time >= (now() - interval '20 minutes') 
  AND start_time <= (now() + interval '2 hours')
);