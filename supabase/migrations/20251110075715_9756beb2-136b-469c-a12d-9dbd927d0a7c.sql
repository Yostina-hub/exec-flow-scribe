-- Create table for document relationships
CREATE TABLE IF NOT EXISTS public.notebook_document_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES public.notebook_sources(id) ON DELETE CASCADE,
  related_document_id UUID NOT NULL REFERENCES public.notebook_sources(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('similar_topic', 'follow_up', 'contradicts', 'supports', 'referenced_in', 'prerequisite')),
  relationship_strength NUMERIC NOT NULL CHECK (relationship_strength >= 0 AND relationship_strength <= 1),
  relationship_summary TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_document_id, related_document_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_doc_relationships_source ON public.notebook_document_relationships(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_relationships_related ON public.notebook_document_relationships(related_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_relationships_user ON public.notebook_document_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_relationships_strength ON public.notebook_document_relationships(relationship_strength DESC);

-- Enable RLS
ALTER TABLE public.notebook_document_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own document relationships"
  ON public.notebook_document_relationships
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document relationships"
  ON public.notebook_document_relationships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document relationships"
  ON public.notebook_document_relationships
  FOR DELETE
  USING (auth.uid() = user_id);