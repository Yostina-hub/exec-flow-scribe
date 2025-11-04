-- Create table for Jitsi/TMeet settings
CREATE TABLE IF NOT EXISTS public.jitsi_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_token TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'meet.jit.si',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jitsi_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own jitsi settings"
  ON public.jitsi_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jitsi settings"
  ON public.jitsi_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jitsi settings"
  ON public.jitsi_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_jitsi_settings_user_id ON public.jitsi_settings(user_id);