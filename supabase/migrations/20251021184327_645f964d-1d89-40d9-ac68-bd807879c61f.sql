-- Create audit logs table for compliance
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- joined, left, mic_granted, mic_revoked, role_changed, settings_updated, recording_started, recording_stopped
  action_details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Meeting participants can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create recording consent table for GDPR compliance
CREATE TABLE public.recording_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  consent_given boolean NOT NULL DEFAULT false,
  consent_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  consent_version text NOT NULL DEFAULT '1.0',
  ip_address text,
  withdrawal_timestamp timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Enable RLS on recording_consents
ALTER TABLE public.recording_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recording_consents
CREATE POLICY "Users can view their own consents"
ON public.recording_consents
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own consents"
ON public.recording_consents
FOR ALL
USING (user_id = auth.uid());

-- Create meeting templates table
CREATE TABLE public.meeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  duration_minutes integer DEFAULT 60,
  template_type text DEFAULT 'standard', -- standard, recurring, workshop, townhall, board_meeting
  default_agenda jsonb DEFAULT '[]'::jsonb,
  default_attendee_roles jsonb DEFAULT '{}'::jsonb,
  meeting_settings jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  use_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on meeting_templates
ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_templates
CREATE POLICY "Users can view public templates or their own"
ON public.meeting_templates
FOR SELECT
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates"
ON public.meeting_templates
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
ON public.meeting_templates
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
ON public.meeting_templates
FOR DELETE
USING (created_by = auth.uid());

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  push_enabled boolean DEFAULT true,
  notify_meeting_start boolean DEFAULT true,
  notify_meeting_reminder_minutes integer DEFAULT 15,
  notify_hand_raised boolean DEFAULT true,
  notify_mic_granted boolean DEFAULT true,
  notify_action_assigned boolean DEFAULT true,
  notify_action_due boolean DEFAULT true,
  notify_mention boolean DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.notification_preferences
FOR ALL
USING (user_id = auth.uid());

-- Create breakout rooms table
CREATE TABLE public.breakout_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  room_number integer NOT NULL,
  duration_minutes integer DEFAULT 15,
  status text NOT NULL DEFAULT 'pending', -- pending, active, completed
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, room_number)
);

-- Enable RLS on breakout_rooms
ALTER TABLE public.breakout_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for breakout_rooms
CREATE POLICY "Meeting participants can view breakout rooms"
ON public.breakout_rooms
FOR SELECT
USING (
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Meeting creators can manage breakout rooms"
ON public.breakout_rooms
FOR ALL
USING (
  meeting_id IN (
    SELECT id FROM meetings WHERE created_by = auth.uid()
  )
);

-- Create breakout room assignments table
CREATE TABLE public.breakout_room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breakout_room_id uuid NOT NULL REFERENCES public.breakout_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  joined_at timestamp with time zone,
  left_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(breakout_room_id, user_id)
);

-- Enable RLS on breakout_room_assignments
ALTER TABLE public.breakout_room_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for breakout_room_assignments
CREATE POLICY "Users can view their own breakout assignments"
ON public.breakout_room_assignments
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Meeting creators can manage breakout assignments"
ON public.breakout_room_assignments
FOR ALL
USING (
  breakout_room_id IN (
    SELECT br.id FROM breakout_rooms br
    JOIN meetings m ON m.id = br.meeting_id
    WHERE m.created_by = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_recording_consents_updated_at
BEFORE UPDATE ON public.recording_consents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_templates_updated_at
BEFORE UPDATE ON public.meeting_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_breakout_rooms_updated_at
BEFORE UPDATE ON public.breakout_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_audit_logs_meeting_id ON public.audit_logs(meeting_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_recording_consents_meeting_user ON public.recording_consents(meeting_id, user_id);
CREATE INDEX idx_breakout_rooms_meeting_id ON public.breakout_rooms(meeting_id);
CREATE INDEX idx_breakout_room_assignments_user ON public.breakout_room_assignments(user_id);

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_consents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.breakout_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.breakout_room_assignments;