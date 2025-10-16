-- Add security preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS security_preferences JSONB DEFAULT jsonb_build_object(
  'data_retention_period', '1year',
  'two_factor_enabled', false,
  'encrypt_recordings', true,
  'activity_logging', true
);