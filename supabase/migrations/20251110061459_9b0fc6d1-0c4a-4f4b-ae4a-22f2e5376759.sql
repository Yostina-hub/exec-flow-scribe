-- Create user activity log table
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_activity_type ON public.user_activity_log(activity_type);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.user_activity_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.user_activity_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
  ON public.user_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- System can insert activity logs
CREATE POLICY "System can insert activity logs"
  ON public.user_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.user_activity_log IS 'Tracks all user management activities including creation, role changes, and password resets';
COMMENT ON COLUMN public.user_activity_log.activity_type IS 'Type of activity: user_created, role_added, role_removed, password_reset, profile_updated, user_deleted';
COMMENT ON COLUMN public.user_activity_log.changes IS 'JSON object containing details of what changed';
