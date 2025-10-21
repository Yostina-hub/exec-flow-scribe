-- Create meeting_summaries table for AI-generated summaries
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('brief', 'detailed', 'executive', 'action_items')),
  content TEXT NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  model_used TEXT,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create speaker_analytics table for tracking speaking time
CREATE TABLE IF NOT EXISTS public.speaker_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  speaking_time_seconds INTEGER NOT NULL DEFAULT 0,
  interruptions_count INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  sentiment_score NUMERIC(3,2),
  engagement_score NUMERIC(3,2),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Create meeting_insights table for AI-generated insights
CREATE TABLE IF NOT EXISTS public.meeting_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('key_decision', 'risk_flag', 'opportunity', 'blocker', 'trend')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  related_attendees UUID[],
  timestamp TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_summaries
CREATE POLICY "Users can view summaries from their meetings"
  ON public.meeting_summaries FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert summaries"
  ON public.meeting_summaries FOR INSERT
  WITH CHECK (true);

-- RLS Policies for speaker_analytics
CREATE POLICY "Users can view analytics from their meetings"
  ON public.speaker_analytics FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage speaker analytics"
  ON public.speaker_analytics FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for meeting_insights
CREATE POLICY "Users can view insights from their meetings"
  ON public.meeting_insights FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert insights"
  ON public.meeting_insights FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update insights from their meetings"
  ON public.meeting_insights FOR UPDATE
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_summaries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speaker_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_insights;

-- Create indexes for performance
CREATE INDEX idx_meeting_summaries_meeting_id ON public.meeting_summaries(meeting_id);
CREATE INDEX idx_speaker_analytics_meeting_id ON public.speaker_analytics(meeting_id);
CREATE INDEX idx_speaker_analytics_user_id ON public.speaker_analytics(user_id);
CREATE INDEX idx_meeting_insights_meeting_id ON public.meeting_insights(meeting_id);
CREATE INDEX idx_meeting_insights_type ON public.meeting_insights(insight_type);