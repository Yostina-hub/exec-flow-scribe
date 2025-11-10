-- Create auto encryption rules table
CREATE TABLE public.auto_encryption_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sensitivity_level TEXT NOT NULL CHECK (sensitivity_level IN ('standard', 'confidential', 'highly_confidential', 'top_secret')),
  auto_encrypt BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sensitivity_level)
);

-- Enable RLS
ALTER TABLE public.auto_encryption_rules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own encryption rules"
  ON public.auto_encryption_rules
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own encryption rules"
  ON public.auto_encryption_rules
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption rules"
  ON public.auto_encryption_rules
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own encryption rules"
  ON public.auto_encryption_rules
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_auto_encryption_rules_updated_at
  BEFORE UPDATE ON public.auto_encryption_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_auto_encryption_rules_user_id ON public.auto_encryption_rules(user_id);

-- Insert default rules for existing encryption users
INSERT INTO public.auto_encryption_rules (user_id, sensitivity_level, auto_encrypt)
SELECT DISTINCT user_id, 'highly_confidential', true
FROM public.user_encryption_keys
WHERE is_active = true
ON CONFLICT (user_id, sensitivity_level) DO NOTHING;

INSERT INTO public.auto_encryption_rules (user_id, sensitivity_level, auto_encrypt)
SELECT DISTINCT user_id, 'top_secret', true
FROM public.user_encryption_keys
WHERE is_active = true
ON CONFLICT (user_id, sensitivity_level) DO NOTHING;