-- Create distribution approval workflow tables

-- Table to define who can approve distributions
CREATE TABLE IF NOT EXISTS public.distribution_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  approval_order INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(meeting_id, user_id)
);

-- Table to track approval requests
CREATE TABLE IF NOT EXISTS public.distribution_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  distribution_history_id UUID REFERENCES public.distribution_history(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  required_approvals INTEGER NOT NULL DEFAULT 1,
  current_approvals INTEGER NOT NULL DEFAULT 0,
  approval_threshold TEXT NOT NULL DEFAULT 'all' CHECK (approval_threshold IN ('all', 'majority', 'any')),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to track individual approver responses
CREATE TABLE IF NOT EXISTS public.distribution_approval_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES public.distribution_approval_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL CHECK (response IN ('approved', 'rejected')),
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(approval_request_id, approver_id)
);

-- Enable RLS
ALTER TABLE public.distribution_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_approval_responses ENABLE ROW LEVEL SECURITY;

-- Policies for distribution_approvers
CREATE POLICY "Users can view approvers for their meetings"
  ON public.distribution_approvers
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_attendees WHERE user_id = auth.uid()
    ) OR
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can manage approvers"
  ON public.distribution_approvers
  FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

-- Policies for distribution_approval_requests
CREATE POLICY "Users can view approval requests for their meetings"
  ON public.distribution_approval_requests
  FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_attendees WHERE user_id = auth.uid()
    ) OR
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    ) OR
    meeting_id IN (
      SELECT meeting_id FROM public.distribution_approvers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create approval requests for their meetings"
  ON public.distribution_approval_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by AND
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "System can update approval requests"
  ON public.distribution_approval_requests
  FOR UPDATE
  USING (true);

-- Policies for distribution_approval_responses
CREATE POLICY "Approvers can view responses for their requests"
  ON public.distribution_approval_responses
  FOR SELECT
  USING (
    approver_id = auth.uid() OR
    approval_request_id IN (
      SELECT id FROM public.distribution_approval_requests 
      WHERE requested_by = auth.uid()
    )
  );

CREATE POLICY "Designated approvers can respond"
  ON public.distribution_approval_responses
  FOR INSERT
  WITH CHECK (
    auth.uid() = approver_id AND
    approval_request_id IN (
      SELECT dar.id 
      FROM public.distribution_approval_requests dar
      JOIN public.distribution_approvers da ON da.meeting_id = dar.meeting_id
      WHERE da.user_id = auth.uid() AND dar.status = 'pending'
    )
  );

-- Create indexes
CREATE INDEX idx_approvers_meeting ON public.distribution_approvers(meeting_id);
CREATE INDEX idx_approvers_user ON public.distribution_approvers(user_id);
CREATE INDEX idx_approval_requests_meeting ON public.distribution_approval_requests(meeting_id);
CREATE INDEX idx_approval_requests_status ON public.distribution_approval_requests(status);
CREATE INDEX idx_approval_responses_request ON public.distribution_approval_responses(approval_request_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_approval_requests_updated_at_trigger
  BEFORE UPDATE ON public.distribution_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if distribution is approved
CREATE OR REPLACE FUNCTION public.is_distribution_approved(_meeting_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_request RECORD;
BEGIN
  -- Get the latest approval request for this meeting
  SELECT * INTO v_latest_request
  FROM public.distribution_approval_requests
  WHERE meeting_id = _meeting_id
  ORDER BY requested_at DESC
  LIMIT 1;
  
  -- If no approval request exists, return true (no approval needed)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check if the request is approved
  RETURN v_latest_request.status = 'approved';
END;
$$;

-- Trigger function to check and update approval status
CREATE OR REPLACE FUNCTION public.check_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_total_approvers INTEGER;
  v_approved_count INTEGER;
  v_rejected_count INTEGER;
  v_new_status TEXT;
BEGIN
  -- Get the approval request
  SELECT * INTO v_request
  FROM public.distribution_approval_requests
  WHERE id = NEW.approval_request_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Count total approvers
  SELECT COUNT(*) INTO v_total_approvers
  FROM public.distribution_approvers
  WHERE meeting_id = v_request.meeting_id;
  
  -- Count responses
  SELECT 
    COUNT(*) FILTER (WHERE response = 'approved'),
    COUNT(*) FILTER (WHERE response = 'rejected')
  INTO v_approved_count, v_rejected_count
  FROM public.distribution_approval_responses
  WHERE approval_request_id = v_request.id;
  
  -- Determine new status based on threshold
  v_new_status := v_request.status;
  
  IF v_request.approval_threshold = 'all' THEN
    -- All approvers must approve
    IF v_approved_count = v_total_approvers THEN
      v_new_status := 'approved';
    ELSIF v_rejected_count > 0 THEN
      v_new_status := 'rejected';
    END IF;
  ELSIF v_request.approval_threshold = 'majority' THEN
    -- Majority must approve
    IF v_approved_count > (v_total_approvers / 2) THEN
      v_new_status := 'approved';
    ELSIF v_rejected_count > (v_total_approvers / 2) THEN
      v_new_status := 'rejected';
    END IF;
  ELSIF v_request.approval_threshold = 'any' THEN
    -- Any one approval is enough
    IF v_approved_count > 0 THEN
      v_new_status := 'approved';
    ELSIF v_rejected_count = v_total_approvers THEN
      v_new_status := 'rejected';
    END IF;
  END IF;
  
  -- Update the request if status changed
  IF v_new_status != v_request.status THEN
    UPDATE public.distribution_approval_requests
    SET 
      status = v_new_status,
      current_approvals = v_approved_count,
      completed_at = CASE WHEN v_new_status IN ('approved', 'rejected') THEN now() ELSE NULL END
    WHERE id = v_request.id;
    
    -- If approved, trigger distribution if scheduled
    IF v_new_status = 'approved' THEN
      -- Create notification for requester
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        v_request.requested_by,
        'distribution_approved',
        'Distribution Approved',
        'Your distribution request has been approved and will be sent shortly.',
        jsonb_build_object('meeting_id', v_request.meeting_id, 'approval_request_id', v_request.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on approval responses
CREATE TRIGGER check_approval_status_trigger
  AFTER INSERT ON public.distribution_approval_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_approval_status();