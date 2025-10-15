-- Create transcription preferences table
CREATE TABLE IF NOT EXISTS public.transcription_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable_ai' CHECK (provider IN ('lovable_ai', 'openai')),
  openai_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.transcription_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own transcription preferences"
ON public.transcription_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own transcription preferences"
ON public.transcription_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own transcription preferences"
ON public.transcription_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_transcription_preferences_updated_at
BEFORE UPDATE ON public.transcription_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();