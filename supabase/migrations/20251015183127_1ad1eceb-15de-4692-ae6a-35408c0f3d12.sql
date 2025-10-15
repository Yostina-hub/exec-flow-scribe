-- Decision replay timeline
CREATE TABLE public.decision_timeline_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  segment_start timestamp with time zone NOT NULL,
  segment_end timestamp with time zone NOT NULL,
  video_timestamp timestamp with time zone,
  audio_url text,
  draft_snapshot jsonb,
  cited_data jsonb,
  context_before text,
  context_after text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.decision_timeline_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view decision segments from their meetings"
ON public.decision_timeline_segments FOR SELECT
USING (
  meeting_id IN (
    SELECT meetings.id FROM meetings
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees WHERE meeting_id = meetings.id
    )
  )
);

CREATE INDEX idx_decision_timeline_meeting ON public.decision_timeline_segments(meeting_id);
CREATE INDEX idx_decision_timeline_decision ON public.decision_timeline_segments(decision_id);

-- Interruption catch-up cards
CREATE TABLE public.interruption_catchups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  left_at timestamp with time zone NOT NULL,
  returned_at timestamp with time zone,
  missed_decisions text[],
  missed_actions text[],
  key_changes jsonb NOT NULL,
  suggested_questions text[],
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.interruption_catchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own catch-up cards"
ON public.interruption_catchups FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own catch-up cards"
ON public.interruption_catchups FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_interruption_user ON public.interruption_catchups(user_id);
CREATE INDEX idx_interruption_meeting ON public.interruption_catchups(meeting_id);

-- Executive coach hints
CREATE TABLE public.executive_coach_hints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  hint_type text NOT NULL,
  hint_message text NOT NULL,
  priority integer DEFAULT 0,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

ALTER TABLE public.executive_coach_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach hints"
ON public.executive_coach_hints FOR SELECT
USING (user_id = auth.uid());

CREATE INDEX idx_coach_hints_user ON public.executive_coach_hints(user_id, is_read);
CREATE INDEX idx_coach_hints_meeting ON public.executive_coach_hints(meeting_id);

-- Context capsules for attendees
CREATE TABLE public.context_capsules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_context text,
  key_points text[],
  suggested_contribution text,
  reading_time_seconds integer DEFAULT 90,
  generated_at timestamp with time zone DEFAULT now(),
  viewed_at timestamp with time zone
);

ALTER TABLE public.context_capsules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own context capsules"
ON public.context_capsules FOR SELECT
USING (user_id = auth.uid());

CREATE INDEX idx_context_capsules_user ON public.context_capsules(user_id);
CREATE INDEX idx_context_capsules_meeting ON public.context_capsules(meeting_id);

-- Redacted document versions
CREATE TABLE public.redacted_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  original_content text NOT NULL,
  redacted_content text NOT NULL,
  redaction_map jsonb NOT NULL,
  sensitivity_level text NOT NULL,
  audience_type text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.redacted_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view redacted docs from their meetings"
ON public.redacted_documents FOR SELECT
USING (
  meeting_id IN (
    SELECT meetings.id FROM meetings
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees WHERE meeting_id = meetings.id
    )
  )
);

CREATE POLICY "Users can create redacted docs"
ON public.redacted_documents FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Knowledge graph entities and relationships
CREATE TABLE public.knowledge_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_name text NOT NULL,
  entity_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(entity_type, entity_name)
);

ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view knowledge entities"
ON public.knowledge_entities FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TABLE public.knowledge_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id uuid NOT NULL REFERENCES public.knowledge_entities(id) ON DELETE CASCADE,
  to_entity_id uuid NOT NULL REFERENCES public.knowledge_entities(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  relationship_data jsonb,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.decisions(id) ON DELETE CASCADE,
  strength numeric DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view knowledge relationships"
ON public.knowledge_relationships FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_knowledge_from ON public.knowledge_relationships(from_entity_id);
CREATE INDEX idx_knowledge_to ON public.knowledge_relationships(to_entity_id);
CREATE INDEX idx_knowledge_meeting ON public.knowledge_relationships(meeting_id);

-- Outcome simulations
CREATE TABLE public.outcome_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.decisions(id) ON DELETE CASCADE,
  scenario_name text NOT NULL,
  scenario_description text,
  assumptions jsonb NOT NULL,
  projected_outcomes jsonb NOT NULL,
  impact_score numeric,
  confidence_level numeric,
  data_sources jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.outcome_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view simulations from their meetings"
ON public.outcome_simulations FOR SELECT
USING (
  meeting_id IN (
    SELECT meetings.id FROM meetings
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees WHERE meeting_id = meetings.id
    )
  )
);

CREATE POLICY "Users can create outcome simulations"
ON public.outcome_simulations FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE INDEX idx_outcome_sim_meeting ON public.outcome_simulations(meeting_id);
CREATE INDEX idx_outcome_sim_decision ON public.outcome_simulations(decision_id);