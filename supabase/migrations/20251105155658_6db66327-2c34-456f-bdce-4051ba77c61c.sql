-- Enable realtime for meetings-related tables
-- Ensure full row data is available for updates
ALTER TABLE public.meetings REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.agenda_items REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.meeting_attendees REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_attendees;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;