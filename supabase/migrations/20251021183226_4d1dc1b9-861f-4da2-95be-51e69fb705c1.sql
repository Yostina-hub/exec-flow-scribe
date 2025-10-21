-- Add speaking permission fields to meeting_attendees table
ALTER TABLE public.meeting_attendees
ADD COLUMN can_speak boolean DEFAULT false,
ADD COLUMN is_speaking boolean DEFAULT false,
ADD COLUMN speaking_requested_at timestamp with time zone,
ADD COLUMN microphone_granted_at timestamp with time zone,
ADD COLUMN speaking_duration_seconds integer DEFAULT 0,
ADD COLUMN last_spoke_at timestamp with time zone;

-- Add participant role types
ALTER TABLE public.meeting_attendees
ALTER COLUMN role TYPE text,
ALTER COLUMN role SET DEFAULT 'participant';

COMMENT ON COLUMN public.meeting_attendees.can_speak IS 'Whether the participant currently has permission to speak';
COMMENT ON COLUMN public.meeting_attendees.is_speaking IS 'Whether the participant is actively speaking';
COMMENT ON COLUMN public.meeting_attendees.speaking_requested_at IS 'When the participant raised their hand';
COMMENT ON COLUMN public.meeting_attendees.microphone_granted_at IS 'When microphone access was granted';

-- Create speaker queue table for ordered speaking
CREATE TABLE public.speaker_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  queue_position integer NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending, active, completed, skipped
  time_limit_seconds integer,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, queue_position)
);

-- Enable RLS on speaker_queue
ALTER TABLE public.speaker_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for speaker_queue
CREATE POLICY "Users can view speaker queue for their meetings"
ON public.speaker_queue
FOR SELECT
USING (
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Meeting creators can manage speaker queue"
ON public.speaker_queue
FOR ALL
USING (
  meeting_id IN (
    SELECT id FROM meetings WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can request to speak"
ON public.speaker_queue
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

-- Create meeting settings table for auto-assignment and controls
CREATE TABLE public.meeting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE UNIQUE,
  auto_assignment_enabled boolean DEFAULT false,
  auto_assignment_mode text DEFAULT 'sequential', -- sequential, round_robin, priority, time_boxed
  default_speaking_time_seconds integer DEFAULT 300, -- 5 minutes default
  require_host_approval boolean DEFAULT true,
  mute_on_join boolean DEFAULT true,
  allow_hand_raise boolean DEFAULT true,
  recording_mode text DEFAULT 'authorized_only', -- all, authorized_only, host_only
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on meeting_settings
ALTER TABLE public.meeting_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_settings
CREATE POLICY "Users can view settings for their meetings"
ON public.meeting_settings
FOR SELECT
USING (
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Meeting creators can manage settings"
ON public.meeting_settings
FOR ALL
USING (
  meeting_id IN (
    SELECT id FROM meetings WHERE created_by = auth.uid()
  )
);

-- Create participant status log for analytics
CREATE TABLE public.participant_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status_type text NOT NULL, -- joined, left, muted, unmuted, speaking_started, speaking_ended, hand_raised, hand_lowered
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on participant_status_log
ALTER TABLE public.participant_status_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participant_status_log
CREATE POLICY "Users can view status log for their meetings"
ON public.participant_status_log
FOR SELECT
USING (
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can log participant status"
ON public.participant_status_log
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at on speaker_queue
CREATE TRIGGER update_speaker_queue_updated_at
BEFORE UPDATE ON public.speaker_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on meeting_settings
CREATE TRIGGER update_meeting_settings_updated_at
BEFORE UPDATE ON public.meeting_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_attendees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speaker_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_status_log;

-- Add indexes for performance
CREATE INDEX idx_speaker_queue_meeting_id ON public.speaker_queue(meeting_id);
CREATE INDEX idx_speaker_queue_user_id ON public.speaker_queue(user_id);
CREATE INDEX idx_speaker_queue_status ON public.speaker_queue(status);
CREATE INDEX idx_participant_status_log_meeting_id ON public.participant_status_log(meeting_id);
CREATE INDEX idx_participant_status_log_timestamp ON public.participant_status_log(timestamp);
CREATE INDEX idx_meeting_attendees_speaking ON public.meeting_attendees(meeting_id, is_speaking) WHERE is_speaking = true;