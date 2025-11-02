-- Drop duplicate RLS policies on meeting_media table that are causing conflicts
-- The old policies require users to be in meeting_attendees, but creators may not be added there

-- Drop old INSERT policy that only checks meeting_attendees
DROP POLICY IF EXISTS "Users can upload media for their meetings" ON public.meeting_media;

-- Drop old SELECT policy that only checks meeting_attendees  
DROP POLICY IF EXISTS "Users can view media for their meetings" ON public.meeting_media;

-- Keep the newer, more permissive policies created in migration 20251022080901
-- "Users can upload media to their meetings" - allows creators OR attendees
-- "Users can view media from their meetings" - allows creators OR attendees