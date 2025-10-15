-- Sign-off workflow tables

-- Signature requests for meeting minutes
CREATE TABLE public.signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  minutes_version_id UUID NOT NULL REFERENCES public.minutes_versions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
  signed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  package_data JSONB NOT NULL, -- Contains minutes, decisions, actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Delegation chain tracking
CREATE TABLE public.delegation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  delegated_from UUID NOT NULL REFERENCES auth.users(id),
  delegated_to UUID NOT NULL REFERENCES auth.users(id),
  delegated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reason_code TEXT NOT NULL,
  reason_details TEXT,
  cryptographic_hash TEXT NOT NULL, -- SHA-256 hash of delegation record
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Section sensitivity levels
CREATE TABLE public.section_sensitivities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('hr', 'financial', 'legal', 'ma', 'strategic', 'general')),
  section_content TEXT NOT NULL,
  sensitivity_level TEXT NOT NULL DEFAULT 'standard' CHECK (sensitivity_level IN ('standard', 'confidential', 'restricted')),
  requires_countersignature BOOLEAN DEFAULT false,
  redacted_for_distribution BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Countersignatures for sensitive sections
CREATE TABLE public.countersignatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_sensitivity_id UUID NOT NULL REFERENCES public.section_sensitivities(id) ON DELETE CASCADE,
  signature_request_id UUID NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  required_role TEXT NOT NULL, -- e.g., 'cfo', 'legal_counsel', 'hr_director'
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  signed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_signature_requests_meeting ON public.signature_requests(meeting_id);
CREATE INDEX idx_signature_requests_assigned ON public.signature_requests(assigned_to);
CREATE INDEX idx_signature_requests_status ON public.signature_requests(status);
CREATE INDEX idx_delegation_records_request ON public.delegation_records(signature_request_id);
CREATE INDEX idx_section_sensitivities_meeting ON public.section_sensitivities(meeting_id);
CREATE INDEX idx_countersignatures_request ON public.countersignatures(signature_request_id);

-- RLS Policies
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_sensitivities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countersignatures ENABLE ROW LEVEL SECURITY;

-- Signature requests policies
CREATE POLICY "Users can view signature requests assigned to them"
  ON public.signature_requests FOR SELECT
  USING (assigned_to = auth.uid() OR requested_by = auth.uid());

CREATE POLICY "Users can create signature requests"
  ON public.signature_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Assigned users can update signature requests"
  ON public.signature_requests FOR UPDATE
  USING (assigned_to = auth.uid());

-- Delegation records policies
CREATE POLICY "Users can view their delegation records"
  ON public.delegation_records FOR SELECT
  USING (delegated_from = auth.uid() OR delegated_to = auth.uid());

CREATE POLICY "Users can create delegation records"
  ON public.delegation_records FOR INSERT
  WITH CHECK (delegated_from = auth.uid());

-- Section sensitivities policies
CREATE POLICY "Users can view sections from their meetings"
  ON public.section_sensitivities FOR SELECT
  USING (meeting_id IN (
    SELECT meetings.id FROM meetings
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees
      WHERE meeting_attendees.meeting_id = meetings.id
    )
  ));

CREATE POLICY "Users can create sensitive sections"
  ON public.section_sensitivities FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Countersignatures policies
CREATE POLICY "Users can view their countersignature requests"
  ON public.countersignatures FOR SELECT
  USING (assigned_to = auth.uid() OR signature_request_id IN (
    SELECT id FROM signature_requests WHERE requested_by = auth.uid()
  ));

CREATE POLICY "Assigned users can update countersignatures"
  ON public.countersignatures FOR UPDATE
  USING (assigned_to = auth.uid());

CREATE POLICY "Users can create countersignature requests"
  ON public.countersignatures FOR INSERT
  WITH CHECK (signature_request_id IN (
    SELECT id FROM signature_requests WHERE requested_by = auth.uid()
  ));