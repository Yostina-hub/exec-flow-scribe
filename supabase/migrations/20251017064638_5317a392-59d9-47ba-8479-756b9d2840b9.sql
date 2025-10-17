-- Add RLS policies for meetings table
-- Allow users to view meetings they attend or created
CREATE POLICY "Users can view meetings they attend or created"
ON public.meetings
FOR SELECT
USING (
  auth.uid() = created_by 
  OR 
  auth.uid() IN (
    SELECT user_id FROM meeting_attendees WHERE meeting_id = meetings.id
  )
);

-- Allow authenticated users to create meetings
CREATE POLICY "Authenticated users can create meetings"
ON public.meetings
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow creators to update their meetings
CREATE POLICY "Creators can update their meetings"
ON public.meetings
FOR UPDATE
USING (auth.uid() = created_by);

-- Allow creators to delete their meetings
CREATE POLICY "Creators can delete their meetings"
ON public.meetings
FOR DELETE
USING (auth.uid() = created_by);