-- Break RLS recursion: simplify meeting_attendees SELECT policies
-- Remove policies that reference meetings or functions that reference meetings
DROP POLICY IF EXISTS "Participants can view attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Participants can view attendees of their meetings" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Users can view their attendee rows" ON public.meeting_attendees;

-- Ensure a single, safe SELECT policy remains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='meeting_attendees' 
      AND policyname='Users can view their own attendee records' AND cmd='SELECT'
  ) THEN
    CREATE POLICY "Users can view their own attendee records"
      ON public.meeting_attendees
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;