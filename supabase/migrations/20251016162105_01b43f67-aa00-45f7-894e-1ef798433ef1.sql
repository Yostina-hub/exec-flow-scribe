-- Create event categories table for color-coded events
CREATE TABLE IF NOT EXISTS public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color_hex TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Add new columns to meetings table for enhanced calendar functionality
ALTER TABLE public.meetings 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.event_categories(id),
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'confidential')),
  ADD COLUMN IF NOT EXISTS organizer_notes TEXT;

-- Create recurrence rules table
CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY')),
  interval INTEGER DEFAULT 1,
  by_day TEXT[], -- ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  by_month_day INTEGER[],
  until_date TIMESTAMPTZ,
  occurrence_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event exceptions table for per-date overrides
CREATE TABLE IF NOT EXISTS public.event_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_cancelled BOOLEAN DEFAULT false,
  override_start_time TIMESTAMPTZ,
  override_end_time TIMESTAMPTZ,
  override_location TEXT,
  override_description TEXT,
  override_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(meeting_id, exception_date)
);

-- Enhance meeting_attendees with response status and role
ALTER TABLE public.meeting_attendees 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'required' CHECK (role IN ('required', 'optional', 'chair', 'organizer')),
  ADD COLUMN IF NOT EXISTS response_status TEXT DEFAULT 'none' CHECK (response_status IN ('yes', 'no', 'maybe', 'none')),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Create event notifications table
CREATE TABLE IF NOT EXISTS public.event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offset_minutes INTEGER NOT NULL, -- e.g., 1440 for 24h, 60 for 1h, 10 for 10m
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id, offset_minutes, channel)
);

-- Enable RLS on new tables
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_categories
CREATE POLICY "Anyone can view active categories"
  ON public.event_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.event_categories FOR ALL
  USING (has_permission(auth.uid(), 'meetings'::permission_resource, 'manage'::permission_action));

-- RLS Policies for recurrence_rules
CREATE POLICY "Users can view recurrence for their meetings"
  ON public.recurrence_rules FOR SELECT
  USING (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Meeting creators can manage recurrence"
  ON public.recurrence_rules FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for event_exceptions
CREATE POLICY "Users can view exceptions for their meetings"
  ON public.event_exceptions FOR SELECT
  USING (
    meeting_id IN (
      SELECT meetings.id FROM meetings
      WHERE auth.uid() IN (
        SELECT user_id FROM meeting_attendees
        WHERE meeting_attendees.meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Meeting creators can manage exceptions"
  ON public.event_exceptions FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for event_notifications
CREATE POLICY "Users can view their own notifications"
  ON public.event_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own notifications"
  ON public.event_notifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON public.event_notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.event_notifications FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_category ON public.meetings(category_id);
CREATE INDEX IF NOT EXISTS idx_meetings_timezone ON public.meetings(timezone);
CREATE INDEX IF NOT EXISTS idx_meetings_recurring ON public.meetings(is_recurring);
CREATE INDEX IF NOT EXISTS idx_recurrence_meeting ON public.recurrence_rules(meeting_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_meeting ON public.event_exceptions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_date ON public.event_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_notifications_meeting ON public.event_notifications(meeting_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.event_notifications(user_id);

-- Insert default event categories matching the sample
INSERT INTO public.event_categories (name, color_hex, description) VALUES
  ('Board', '#8B5CF6', 'Board meetings and governance'),
  ('Trading', '#3B82F6', 'Trading and market operations'),
  ('PMO', '#10B981', 'Project Management Office meetings'),
  ('Revenue Council', '#F59E0B', 'Revenue planning and review'),
  ('Executive Brief', '#EF4444', 'Executive briefings and updates'),
  ('External', '#6366F1', 'External stakeholder meetings'),
  ('Review', '#EC4899', 'Performance and operational reviews'),
  ('Strategic', '#8B5CF6', 'Strategic planning sessions')
ON CONFLICT (name) DO NOTHING;