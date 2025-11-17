-- Tighten meeting visibility: only creators or explicit attendees can view meetings
-- Remove broader SELECT policies that could expose other users' meetings via related tables
DROP POLICY IF EXISTS "Approved guests can view meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can view meetings for their signature requests" ON public.meetings;

-- Ensure strict SELECT policy exists (creators or attendees only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='meetings' 
      AND policyname='Strict: Only creators and attendees view meetings' AND cmd='SELECT'
  ) THEN
    CREATE POLICY "Strict: Only creators and attendees view meetings"
    ON public.meetings
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM public.meeting_attendees ma 
        WHERE ma.meeting_id = meetings.id AND ma.user_id = auth.uid()
      )
    );
  END IF;
END $$;