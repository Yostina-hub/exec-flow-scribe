-- Enable realtime for transcriptions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcriptions;

-- Enable realtime for decisions table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.decisions;

-- Enable realtime for highlights table
ALTER PUBLICATION supabase_realtime ADD TABLE public.highlights;