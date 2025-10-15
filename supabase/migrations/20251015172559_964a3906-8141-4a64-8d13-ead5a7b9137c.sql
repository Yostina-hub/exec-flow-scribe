-- Create table for SMTP configuration
CREATE TABLE smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  host text NOT NULL,
  port integer NOT NULL DEFAULT 587,
  username text NOT NULL,
  password text NOT NULL,
  from_email text NOT NULL,
  from_name text NOT NULL DEFAULT 'Meeting Minutes',
  use_tls boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE smtp_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own SMTP settings
CREATE POLICY "Users can view their own SMTP settings"
  ON smtp_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMTP settings"
  ON smtp_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMTP settings"
  ON smtp_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMTP settings"
  ON smtp_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_smtp_settings_updated_at
  BEFORE UPDATE ON smtp_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();