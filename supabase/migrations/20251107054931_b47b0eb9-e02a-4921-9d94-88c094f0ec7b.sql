-- Create task notification preferences table
CREATE TABLE IF NOT EXISTS guba_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Notification types
  new_assignment BOOLEAN DEFAULT true,
  due_date_24h BOOLEAN DEFAULT true,
  due_date_1h BOOLEAN DEFAULT true,
  status_change BOOLEAN DEFAULT true,
  overdue_escalation BOOLEAN DEFAULT true,
  reassignment BOOLEAN DEFAULT true,
  -- Channels
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  -- Quiet hours
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create task notification log
CREATE TABLE IF NOT EXISTS guba_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES action_items(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'queued')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE guba_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE guba_notification_log ENABLE ROW LEVEL SECURITY;

-- Policies for notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON guba_notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own notification preferences"
  ON guba_notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies for notification log
CREATE POLICY "Users can view their own notification log"
  ON guba_notification_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all notification logs"
  ON guba_notification_log
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_guba_notification_preferences_user_id ON guba_notification_preferences(user_id);
CREATE INDEX idx_guba_notification_log_user_id ON guba_notification_log(user_id);
CREATE INDEX idx_guba_notification_log_task_id ON guba_notification_log(task_id);
CREATE INDEX idx_guba_notification_log_sent_at ON guba_notification_log(sent_at DESC);
CREATE INDEX idx_guba_notification_log_status ON guba_notification_log(status);

-- Create updated_at trigger
CREATE TRIGGER update_guba_notification_preferences_updated_at
  BEFORE UPDATE ON guba_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if notification should be sent based on quiet hours
CREATE OR REPLACE FUNCTION should_send_notification(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs RECORD;
  v_current_time TIME;
BEGIN
  SELECT * INTO v_prefs
  FROM guba_notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences exist, default to allowing notifications
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- If quiet hours not enabled, allow
  IF NOT v_prefs.quiet_hours_enabled THEN
    RETURN TRUE;
  END IF;

  v_current_time := CURRENT_TIME;

  -- Check if current time is within quiet hours
  IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
    -- Normal case: quiet hours don't cross midnight
    IF v_current_time >= v_prefs.quiet_hours_start AND v_current_time < v_prefs.quiet_hours_end THEN
      RETURN FALSE;
    END IF;
  ELSE
    -- Quiet hours cross midnight
    IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time < v_prefs.quiet_hours_end THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- Trigger function to send notification on new task assignment
CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  -- Get user notification preferences
  SELECT * INTO v_prefs
  FROM guba_notification_preferences
  WHERE user_id = NEW.assigned_to;

  -- If no preferences or new_assignment disabled, skip
  IF NOT FOUND OR NOT v_prefs.new_assignment THEN
    RETURN NEW;
  END IF;

  -- Check quiet hours
  IF NOT should_send_notification(NEW.assigned_to) THEN
    RETURN NEW;
  END IF;

  -- Insert notification log entry
  INSERT INTO guba_notification_log (user_id, task_id, notification_type, channel, status)
  VALUES (NEW.assigned_to, NEW.id, 'new_assignment', 'in_app', 'queued');

  -- Additional channels based on preferences
  IF v_prefs.email_enabled THEN
    INSERT INTO guba_notification_log (user_id, task_id, notification_type, channel, status)
    VALUES (NEW.assigned_to, NEW.id, 'new_assignment', 'email', 'queued');
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new task assignments
CREATE TRIGGER trigger_notify_new_task_assignment
  AFTER INSERT ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_task_assignment();

-- Trigger function to send notification on status change
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs RECORD;
BEGIN
  -- Only if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get user notification preferences (notify the creator)
  SELECT * INTO v_prefs
  FROM guba_notification_preferences
  WHERE user_id = NEW.created_by;

  -- If no preferences or status_change disabled, skip
  IF NOT FOUND OR NOT v_prefs.status_change THEN
    RETURN NEW;
  END IF;

  -- Check quiet hours
  IF NOT should_send_notification(NEW.created_by) THEN
    RETURN NEW;
  END IF;

  -- Insert notification log entry
  INSERT INTO guba_notification_log (user_id, task_id, notification_type, channel, status, metadata)
  VALUES (
    NEW.created_by, 
    NEW.id, 
    'status_change', 
    'in_app', 
    'queued',
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
  );

  RETURN NEW;
END;
$$;

-- Create trigger for status changes
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_status_change();

-- Enable realtime for notification log
ALTER PUBLICATION supabase_realtime ADD TABLE guba_notification_log;