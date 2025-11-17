-- Fix RLS policies for meeting_media table to allow uploads

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert their own meeting media" ON public.meeting_media;
DROP POLICY IF EXISTS "Users can view meeting media they have access to" ON public.meeting_media;
DROP POLICY IF EXISTS "Users can delete their own meeting media" ON public.meeting_media;

-- Enable RLS on meeting_media if not already enabled
ALTER TABLE public.meeting_media ENABLE ROW LEVEL SECURITY;

-- Allow users to insert media for meetings they have access to (creator or attendee)
CREATE POLICY "Users can insert meeting media for accessible meetings"
ON public.meeting_media
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    -- User is the meeting creator
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
    OR
    -- User is a meeting attendee
    EXISTS (
      SELECT 1 FROM public.meeting_attendees ma
      WHERE ma.meeting_id = meeting_media.meeting_id AND ma.user_id = auth.uid()
    )
    OR
    -- User is admin or senior role
    public.is_admin(auth.uid())
  )
);

-- Allow users to view media for meetings they have access to
CREATE POLICY "Users can view meeting media for accessible meetings"
ON public.meeting_media
FOR SELECT
USING (
  -- User is the meeting creator
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_id AND m.created_by = auth.uid()
  )
  OR
  -- User is a meeting attendee
  EXISTS (
    SELECT 1 FROM public.meeting_attendees ma
    WHERE ma.meeting_id = meeting_media.meeting_id AND ma.user_id = auth.uid()
  )
  OR
  -- User is admin or senior role
  public.is_admin(auth.uid())
);

-- Allow users to delete their own uploaded media
CREATE POLICY "Users can delete their own meeting media"
ON public.meeting_media
FOR DELETE
USING (
  auth.uid() = uploaded_by
  OR public.is_admin(auth.uid())
);