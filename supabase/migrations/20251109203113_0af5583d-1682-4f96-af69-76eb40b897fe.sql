-- Update check_approval_status function to remove notification insert
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
  END IF;
  
  RETURN NEW;
END;
$$;