-- Create encryption keys table
CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL,
  key_salt TEXT NOT NULL,
  key_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own encryption keys"
  ON public.user_encryption_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add encryption metadata to meetings
ALTER TABLE public.meetings 
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Add encryption metadata to transcriptions
ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_iv TEXT;

-- Create encryption audit log
CREATE TABLE IF NOT EXISTS public.encryption_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Enable RLS on audit log
ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own encryption audit logs"
  ON public.encryption_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_encryption_keys_updated_at
  BEFORE UPDATE ON public.user_encryption_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_user_encryption_keys_user_id ON public.user_encryption_keys(user_id);
CREATE INDEX idx_encryption_audit_log_user_id ON public.encryption_audit_log(user_id);
CREATE INDEX idx_meetings_encrypted ON public.meetings(is_encrypted) WHERE is_encrypted = true;
CREATE INDEX idx_transcriptions_encrypted ON public.transcriptions(is_encrypted) WHERE is_encrypted = true;