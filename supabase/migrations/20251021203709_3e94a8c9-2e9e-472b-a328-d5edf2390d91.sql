
-- Function to check if user has a senior role (CEO, Chief of Staff, or Admin)
CREATE OR REPLACE FUNCTION public.is_senior_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Admin', 'CEO', 'Chief of Staff')
  )
$$;

-- Function to check time-based meeting access
-- Users can access 30 minutes before and after the meeting
CREATE OR REPLACE FUNCTION public.has_time_based_access(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM meetings m
    WHERE m.id = _meeting_id
      AND (
        -- User is the meeting creator
        m.created_by = _user_id
        OR
        -- User is a senior role (bypass time restrictions)
        public.is_senior_role(_user_id)
        OR
        -- Within time window (30 minutes before start, 30 minutes after end)
        (
          m.start_time - INTERVAL '30 minutes' <= NOW()
          AND
          m.end_time + INTERVAL '30 minutes' >= NOW()
        )
      )
  )
$$;

-- Function to check element-level access (recordings, transcriptions, etc.)
CREATE OR REPLACE FUNCTION public.can_access_element(
  _user_id uuid,
  _meeting_id uuid,
  _element_type text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access boolean;
  v_is_senior boolean;
  v_is_host boolean;
BEGIN
  -- Check if user is senior role
  SELECT public.is_senior_role(_user_id) INTO v_is_senior;
  
  -- Check if user is meeting host
  SELECT EXISTS(
    SELECT 1 FROM meetings WHERE id = _meeting_id AND created_by = _user_id
  ) INTO v_is_host;
  
  -- Senior roles and hosts have full access
  IF v_is_senior OR v_is_host THEN
    RETURN true;
  END IF;
  
  -- Check meeting_access_control for element-specific permissions
  SELECT 
    CASE _element_type
      WHEN 'recordings' THEN COALESCE(mac.can_access_recordings, true)
      WHEN 'transcriptions' THEN COALESCE(mac.can_access_transcriptions, true)
      WHEN 'ai_tools' THEN COALESCE(mac.can_use_ai_tools, true)
      WHEN 'analytics' THEN COALESCE(mac.can_view_analytics, true)
      WHEN 'documents' THEN COALESCE(mac.can_manage_documents, true)
      ELSE true
    END
  INTO v_has_access
  FROM meeting_access_control mac
  WHERE mac.meeting_id = _meeting_id
    AND mac.user_id = _user_id;
  
  -- If no specific access control exists, default to true
  RETURN COALESCE(v_has_access, true);
END;
$$;