-- Add status tracking and escalation columns to action_items
ALTER TABLE action_items
ADD COLUMN IF NOT EXISTS status_detail text CHECK (status_detail IN ('on_track', 'blocked', 'done')),
ADD COLUMN IF NOT EXISTS eta timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_nudge_sent timestamp with time zone,
ADD COLUMN IF NOT EXISTS escalation_level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS escalated_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS escalated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS blocked_reason text;

-- Create action_status_updates table for tracking status change history
CREATE TABLE IF NOT EXISTS action_status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  old_status action_status,
  new_status action_status,
  old_status_detail text,
  new_status_detail text,
  eta timestamp with time zone,
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE action_status_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for action_status_updates
CREATE POLICY "Users can view status updates for their actions"
ON action_status_updates FOR SELECT
USING (
  action_id IN (
    SELECT id FROM action_items 
    WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
);

CREATE POLICY "Users can create status updates for their actions"
ON action_status_updates FOR INSERT
WITH CHECK (
  action_id IN (
    SELECT id FROM action_items 
    WHERE assigned_to = auth.uid()
  ) AND user_id = auth.uid()
);

-- Create notification_log table to track sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  action_id uuid REFERENCES action_items(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  sent_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for notification_log
CREATE POLICY "Users can view their own notifications"
ON notification_log FOR SELECT
USING (recipient_email IN (
  SELECT email FROM profiles WHERE id = auth.uid()
));

-- Create escalation_config table for Chief of Staff and CEO settings
CREATE TABLE IF NOT EXISTS escalation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type text UNIQUE NOT NULL CHECK (role_type IN ('chief_of_staff', 'ceo')),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE escalation_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for escalation_config
CREATE POLICY "Anyone can view escalation config"
ON escalation_config FOR SELECT
USING (true);

CREATE POLICY "Admins can manage escalation config"
ON escalation_config FOR ALL
USING (has_permission(auth.uid(), 'users'::permission_resource, 'manage'::permission_action));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_action_items_status_detail ON action_items(status_detail);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_action_items_escalation_level ON action_items(escalation_level);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_escalation_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_escalation_config_timestamp
BEFORE UPDATE ON escalation_config
FOR EACH ROW
EXECUTE FUNCTION update_escalation_config_updated_at();