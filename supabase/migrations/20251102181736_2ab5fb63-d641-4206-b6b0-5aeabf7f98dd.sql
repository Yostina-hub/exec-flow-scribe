-- Enable realtime for meetings table
ALTER TABLE public.meetings REPLICA IDENTITY FULL;

-- Ensure the table is included in the realtime publication
-- This allows real-time subscriptions to work properly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'meetings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  END IF;
END $$;