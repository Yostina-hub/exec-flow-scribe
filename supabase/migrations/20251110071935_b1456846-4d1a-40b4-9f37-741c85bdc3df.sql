-- Revert recently added meeting visibility policies to restore previous behavior
DROP POLICY IF EXISTS "Users can view meetings for their signature requests" ON public.meetings;
DROP POLICY IF EXISTS "Admins can view all meetings" ON public.meetings;