-- Create feedback tracking table for AI learning
CREATE TABLE IF NOT EXISTS public.guba_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.guba_task_proposals(id) ON DELETE CASCADE,
  task_id text NOT NULL,
  accepted boolean NOT NULL,
  feedback_reason text,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create learning metrics table
CREATE TABLE IF NOT EXISTS public.guba_learning_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type text NOT NULL,
  metric_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamp with time zone DEFAULT now(),
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL
);

-- Enable RLS
ALTER TABLE public.guba_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guba_learning_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for guba_feedback
CREATE POLICY "Users can view their own feedback"
  ON public.guba_feedback FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create feedback"
  ON public.guba_feedback FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- RLS policies for guba_learning_metrics
CREATE POLICY "Anyone can view learning metrics"
  ON public.guba_learning_metrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage learning metrics"
  ON public.guba_learning_metrics FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guba_feedback_proposal_id ON public.guba_feedback(proposal_id);
CREATE INDEX IF NOT EXISTS idx_guba_feedback_meeting_id ON public.guba_feedback(meeting_id);
CREATE INDEX IF NOT EXISTS idx_guba_feedback_created_by ON public.guba_feedback(created_by);
CREATE INDEX IF NOT EXISTS idx_guba_learning_metrics_type ON public.guba_learning_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_guba_learning_metrics_period ON public.guba_learning_metrics(period_start, period_end);

-- Create function to calculate learning metrics
CREATE OR REPLACE FUNCTION calculate_guba_learning_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamp with time zone;
  v_period_end timestamp with time zone;
  v_acceptance_rate numeric;
  v_priority_distribution jsonb;
  v_department_performance jsonb;
BEGIN
  v_period_end := now();
  v_period_start := now() - interval '30 days';

  -- Calculate overall acceptance rate
  SELECT 
    ROUND(
      (COUNT(*) FILTER (WHERE accepted = true)::numeric / 
       NULLIF(COUNT(*), 0)) * 100, 
      2
    )
  INTO v_acceptance_rate
  FROM guba_feedback
  WHERE created_at BETWEEN v_period_start AND v_period_end;

  -- Calculate priority distribution
  SELECT jsonb_object_agg(
    priority,
    json_build_object(
      'total', count,
      'accepted', accepted_count,
      'rate', acceptance_rate
    )
  )
  INTO v_priority_distribution
  FROM (
    SELECT 
      (gtp.generated_tasks->'tasks'->0->>'priority') as priority,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE gf.accepted = true) as accepted_count,
      ROUND(
        (COUNT(*) FILTER (WHERE gf.accepted = true)::numeric / 
         NULLIF(COUNT(*), 0)) * 100,
        2
      ) as acceptance_rate
    FROM guba_feedback gf
    JOIN guba_task_proposals gtp ON gf.proposal_id = gtp.id
    WHERE gf.created_at BETWEEN v_period_start AND v_period_end
    GROUP BY (gtp.generated_tasks->'tasks'->0->>'priority')
  ) sub;

  -- Store metrics
  INSERT INTO guba_learning_metrics (metric_type, metric_data, period_start, period_end)
  VALUES (
    'acceptance_rate',
    jsonb_build_object(
      'overall_rate', COALESCE(v_acceptance_rate, 0),
      'priority_distribution', COALESCE(v_priority_distribution, '{}'::jsonb)
    ),
    v_period_start,
    v_period_end
  );
END;
$$;