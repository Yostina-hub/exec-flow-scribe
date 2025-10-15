-- Create decision outcomes tracking table
CREATE TABLE IF NOT EXISTS public.decision_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid REFERENCES public.decisions(id) ON DELETE CASCADE NOT NULL,
  outcome_description text NOT NULL,
  measured_at timestamp with time zone NOT NULL,
  impact_score integer CHECK (impact_score >= 1 AND impact_score <= 10),
  metrics jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create sentiment analysis table
CREATE TABLE IF NOT EXISTS public.meeting_sentiment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  segment_start timestamp with time zone NOT NULL,
  segment_end timestamp with time zone NOT NULL,
  topic text,
  sentiment_score numeric CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_label text CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'tension', 'optimistic', 'hesitant')),
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  key_phrases text[],
  risk_indicators text[],
  compliance_concerns text[],
  analyzed_at timestamp with time zone DEFAULT now()
);

-- Create commitment tracking table
CREATE TABLE IF NOT EXISTS public.commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  commitment_text text NOT NULL,
  committed_by uuid REFERENCES auth.users(id),
  committed_at timestamp with time zone NOT NULL,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'partial', 'missed', 'revised')),
  fulfillment_evidence text,
  drift_score numeric CHECK (drift_score >= 0 AND drift_score <= 1),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create next meeting suggestions table
CREATE TABLE IF NOT EXISTS public.meeting_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id),
  suggested_for date,
  suggested_title text NOT NULL,
  suggested_agenda jsonb NOT NULL,
  suggested_attendees uuid[],
  reasoning text,
  open_threads integer DEFAULT 0,
  unresolved_risks integer DEFAULT 0,
  upcoming_milestones text[],
  priority_score numeric CHECK (priority_score >= 0 AND priority_score <= 1),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'scheduled')),
  created_at timestamp with time zone DEFAULT now()
);

-- Create executive briefs table
CREATE TABLE IF NOT EXISTS public.executive_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id) NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  brief_content jsonb NOT NULL,
  key_insights text[],
  action_status_summary jsonb,
  risk_alerts text[],
  recommended_focus text[],
  sources jsonb,
  created_for uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_briefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decision_outcomes
CREATE POLICY "Users can view decision outcomes from their meetings"
  ON public.decision_outcomes FOR SELECT
  USING (decision_id IN (
    SELECT d.id FROM decisions d
    INNER JOIN meetings m ON m.id = d.meeting_id
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees WHERE meeting_id = m.id
    )
  ));

CREATE POLICY "Users can create decision outcomes"
  ON public.decision_outcomes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for meeting_sentiment
CREATE POLICY "Users can view sentiment from their meetings"
  ON public.meeting_sentiment FOR SELECT
  USING (meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  ));

-- RLS Policies for commitments
CREATE POLICY "Users can view commitments from their meetings"
  ON public.commitments FOR SELECT
  USING (meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their commitments"
  ON public.commitments FOR UPDATE
  USING (committed_by = auth.uid());

-- RLS Policies for meeting_suggestions
CREATE POLICY "Users can view meeting suggestions"
  ON public.meeting_suggestions FOR SELECT
  USING (auth.uid() = ANY(suggested_attendees) OR meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  ));

-- RLS Policies for executive_briefs
CREATE POLICY "Users can view their executive briefs"
  ON public.executive_briefs FOR SELECT
  USING (created_for = auth.uid() OR meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_decision_outcomes_decision_id ON public.decision_outcomes(decision_id);
CREATE INDEX idx_meeting_sentiment_meeting_id ON public.meeting_sentiment(meeting_id);
CREATE INDEX idx_commitments_meeting_id ON public.commitments(meeting_id);
CREATE INDEX idx_commitments_committed_by ON public.commitments(committed_by);
CREATE INDEX idx_meeting_suggestions_suggested_for ON public.meeting_suggestions(suggested_for);
CREATE INDEX idx_executive_briefs_meeting_id ON public.executive_briefs(meeting_id);