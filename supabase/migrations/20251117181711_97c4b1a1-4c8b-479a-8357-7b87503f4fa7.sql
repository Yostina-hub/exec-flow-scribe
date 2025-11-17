-- Make file_url nullable in meeting_media table for PDF and other generated content
-- that might not have a permanent file URL immediately

ALTER TABLE public.meeting_media 
ALTER COLUMN file_url DROP NOT NULL;

-- Make checksum nullable as well since it's not always needed for all media types
ALTER TABLE public.meeting_media 
ALTER COLUMN checksum DROP NOT NULL;