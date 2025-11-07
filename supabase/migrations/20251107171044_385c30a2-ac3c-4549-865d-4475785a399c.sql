-- Create function for vector similarity search
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