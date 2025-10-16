-- Communication settings table
CREATE TABLE IF NOT EXISTS public.communication_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL CHECK (setting_type IN ('whatsapp', 'sms', 'freepbx', 'escalation')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(setting_type)
);

-- Message logs table for tracking all communications
CREATE TABLE IF NOT EXISTS public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  meeting_id UUID REFERENCES public.meetings(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'call')),
  message_type TEXT NOT NULL CHECK (message_type IN ('reminder', 'urgent', 'notification', 'alert')),
  content TEXT,
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'pending',
  is_urgent BOOLEAN DEFAULT false,
  urgency_keywords TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMP WITH TIME ZONE,
  response_received BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Urgent keywords configuration
CREATE TABLE IF NOT EXISTS public.urgent_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL UNIQUE,
  priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
  auto_escalate BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Escalation rules table
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  priority_level INTEGER NOT NULL CHECK (priority_level BETWEEN 1 AND 5),
  wait_time_minutes INTEGER NOT NULL DEFAULT 15,
  escalate_to TEXT NOT NULL CHECK (escalate_to IN ('sms', 'call', 'both')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Call logs for FreePBX integration
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_log_id UUID REFERENCES public.message_logs(id),
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('reminder', 'urgent', 'escalation')),
  call_status TEXT NOT NULL CHECK (call_status IN ('initiated', 'ringing', 'answered', 'voicemail', 'failed', 'no_answer')) DEFAULT 'initiated',
  call_duration_seconds INTEGER,
  recording_url TEXT,
  call_sid TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgent_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communication_settings (admin only)
CREATE POLICY "Admins can manage communication settings"
  ON public.communication_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    )
  );

-- RLS Policies for message_logs
CREATE POLICY "Users can view their own message logs"
  ON public.message_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert message logs"
  ON public.message_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update message logs"
  ON public.message_logs
  FOR UPDATE
  USING (true);

-- RLS Policies for urgent_keywords (admin only)
CREATE POLICY "Everyone can view urgent keywords"
  ON public.urgent_keywords
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage urgent keywords"
  ON public.urgent_keywords
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    )
  );

-- RLS Policies for escalation_rules (admin only)
CREATE POLICY "Admins can manage escalation rules"
  ON public.escalation_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    )
  );

-- RLS Policies for call_logs
CREATE POLICY "Users can view their own call logs"
  ON public.call_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can manage call logs"
  ON public.call_logs
  FOR ALL
  USING (true);

-- Insert default urgent keywords
INSERT INTO public.urgent_keywords (keyword, priority_level, auto_escalate) VALUES
  ('urgent', 5, true),
  ('emergency', 5, true),
  ('critical', 5, true),
  ('asap', 4, true),
  ('immediate', 4, true),
  ('important', 3, true),
  ('ፍጹም', 5, true), -- "urgent" in Amharic
  ('አስቸኳይ', 5, true); -- "emergency" in Amharic

-- Insert default escalation rules
INSERT INTO public.escalation_rules (rule_name, priority_level, wait_time_minutes, escalate_to) VALUES
  ('Critical - Immediate Call', 5, 5, 'call'),
  ('High Priority - SMS then Call', 4, 15, 'both'),
  ('Medium Priority - SMS Only', 3, 30, 'sms'),
  ('Low Priority - SMS if no response', 2, 60, 'sms');

-- Add indexes for performance
CREATE INDEX idx_message_logs_user_id ON public.message_logs(user_id);
CREATE INDEX idx_message_logs_status ON public.message_logs(status);
CREATE INDEX idx_message_logs_created_at ON public.message_logs(created_at DESC);
CREATE INDEX idx_message_logs_is_urgent ON public.message_logs(is_urgent) WHERE is_urgent = true;
CREATE INDEX idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX idx_call_logs_started_at ON public.call_logs(started_at DESC);

-- Trigger for updating timestamps
CREATE TRIGGER update_communication_settings_updated_at
  BEFORE UPDATE ON public.communication_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_escalation_rules_updated_at
  BEFORE UPDATE ON public.escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();