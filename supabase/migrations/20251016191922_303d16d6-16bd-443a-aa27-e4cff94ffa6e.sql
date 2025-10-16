
-- Add foreign key constraint from meeting_attendees to profiles
ALTER TABLE public.meeting_attendees
ADD CONSTRAINT fk_meeting_attendees_user_id 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id)
ON DELETE CASCADE;
