-- Create task dependencies table
CREATE TABLE IF NOT EXISTS public.guba_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocking' CHECK (dependency_type IN ('blocking', 'informational')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- Create indexes
CREATE INDEX idx_guba_task_dependencies_task_id ON public.guba_task_dependencies(task_id);
CREATE INDEX idx_guba_task_dependencies_depends_on ON public.guba_task_dependencies(depends_on_task_id);

-- Enable RLS
ALTER TABLE public.guba_task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view dependencies for tasks they can see"
  ON public.guba_task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.action_items ai
      WHERE ai.id = task_id
      AND (ai.assigned_to = auth.uid() OR ai.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can create dependencies for their tasks"
  ON public.guba_task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.action_items ai
      WHERE ai.id = task_id
      AND (ai.assigned_to = auth.uid() OR ai.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can delete dependencies for their tasks"
  ON public.guba_task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.action_items ai
      WHERE ai.id = task_id
      AND (ai.assigned_to = auth.uid() OR ai.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Function to check if a task can be started (all blocking dependencies completed)
CREATE OR REPLACE FUNCTION public.can_start_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_blocked BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.guba_task_dependencies gtd
    JOIN public.action_items ai ON ai.id = gtd.depends_on_task_id
    WHERE gtd.task_id = p_task_id
    AND gtd.dependency_type = 'blocking'
    AND ai.status != 'completed'
  ) INTO v_blocked;
  
  RETURN NOT v_blocked;
END;
$$;

-- Function to auto-update task status when dependencies complete
CREATE OR REPLACE FUNCTION public.check_dependent_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if task was just completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find all tasks that depend on this one
    UPDATE public.action_items
    SET updated_at = now()
    WHERE id IN (
      SELECT gtd.task_id
      FROM public.guba_task_dependencies gtd
      WHERE gtd.depends_on_task_id = NEW.id
      AND gtd.dependency_type = 'blocking'
    );
    
    -- Log the dependency completion
    INSERT INTO public.guba_audit_log (
      user_id,
      action,
      entity_type,
      entity_id,
      changes
    )
    SELECT 
      NEW.assigned_to,
      'dependency_completed',
      'action_item',
      gtd.task_id,
      jsonb_build_object(
        'completed_dependency_id', NEW.id,
        'completed_dependency_title', NEW.title
      )
    FROM public.guba_task_dependencies gtd
    WHERE gtd.depends_on_task_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic dependency updates
DROP TRIGGER IF EXISTS trigger_check_dependent_tasks ON public.action_items;
CREATE TRIGGER trigger_check_dependent_tasks
  AFTER UPDATE ON public.action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_dependent_tasks();

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.guba_task_dependencies;