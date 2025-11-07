-- Fix search path for match_transcriptions function
CREATE OR REPLACE FUNCTION match_transcriptions(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  transcription_id uuid,
  meeting_id uuid,
  content text,
  speaker_name text,
  ts timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    te.transcription_id,
    te.meeting_id,
    te.content,
    te.speaker_name,
    te.timestamp as ts,
    1 - (te.embedding <=> query_embedding) as similarity
  FROM transcription_embeddings te
  WHERE 1 - (te.embedding <=> query_embedding) > match_threshold
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix search path for update_meeting_summaries_updated_at function
DROP TRIGGER IF EXISTS update_meeting_summaries_updated_at ON public.meeting_summaries;
DROP FUNCTION IF EXISTS update_meeting_summaries_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_meeting_summaries_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger with the new function
CREATE TRIGGER update_meeting_summaries_updated_at
BEFORE UPDATE ON public.meeting_summaries
FOR EACH ROW
EXECUTE FUNCTION update_meeting_summaries_updated_at();