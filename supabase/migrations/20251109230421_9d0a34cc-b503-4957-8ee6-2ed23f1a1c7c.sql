-- Enable realtime for signature_requests table if not already enabled
ALTER TABLE public.signature_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Only add to publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'signature_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.signature_requests;
  END IF;
END $$;