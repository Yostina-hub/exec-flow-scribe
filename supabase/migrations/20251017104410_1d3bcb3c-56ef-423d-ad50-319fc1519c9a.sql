-- Create notebook_sources table to store various types of sources
CREATE TABLE public.notebook_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('meeting', 'pdf', 'text', 'markdown', 'audio', 'website', 'youtube', 'pasted_text')),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  external_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notebook_sources ENABLE ROW LEVEL SECURITY;

-- Users can view their own sources
CREATE POLICY "Users can view their own notebook sources"
ON public.notebook_sources
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own sources
CREATE POLICY "Users can create notebook sources"
ON public.notebook_sources
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sources
CREATE POLICY "Users can update their own notebook sources"
ON public.notebook_sources
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own sources
CREATE POLICY "Users can delete their own notebook sources"
ON public.notebook_sources
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notebook_sources_updated_at
BEFORE UPDATE ON public.notebook_sources
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for user_id lookups
CREATE INDEX idx_notebook_sources_user_id ON public.notebook_sources(user_id);

-- Create index for source_type
CREATE INDEX idx_notebook_sources_type ON public.notebook_sources(source_type);