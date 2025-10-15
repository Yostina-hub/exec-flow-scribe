-- Brand kit and PDF distribution tables

-- Company brand kits
CREATE TABLE public.brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  header_template TEXT,
  footer_template TEXT,
  color_primary TEXT DEFAULT '#000000',
  color_secondary TEXT DEFAULT '#666666',
  color_accent TEXT DEFAULT '#0066cc',
  watermark_text TEXT DEFAULT 'INTERNAL USE ONLY',
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Exhibits/attachments for meetings
CREATE TABLE public.meeting_exhibits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  exhibit_name TEXT NOT NULL,
  exhibit_type TEXT NOT NULL CHECK (exhibit_type IN ('slide', 'chart', 'document', 'image', 'other')),
  file_url TEXT NOT NULL,
  page_reference TEXT, -- e.g., "Page 5, Appendix A"
  order_index INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Distribution profiles
CREATE TABLE public.distribution_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('exec_team', 'council_chairs', 'project_owners', 'board', 'custom')),
  include_sensitive_sections BOOLEAN DEFAULT false,
  redact_financial BOOLEAN DEFAULT false,
  redact_hr BOOLEAN DEFAULT false,
  redact_legal BOOLEAN DEFAULT false,
  custom_filters JSONB, -- Additional filtering rules
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Distribution profile recipients
CREATE TABLE public.distribution_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.distribution_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, user_id)
);

-- PDF generation history
CREATE TABLE public.pdf_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  minutes_version_id UUID NOT NULL REFERENCES public.minutes_versions(id),
  brand_kit_id UUID REFERENCES public.brand_kits(id),
  pdf_url TEXT NOT NULL,
  approval_stamp JSONB NOT NULL, -- Contains CEO signature, timestamp, hash
  watermark_applied TEXT,
  exhibits_included INTEGER DEFAULT 0,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email distribution log
CREATE TABLE public.email_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_generation_id UUID NOT NULL REFERENCES public.pdf_generations(id) ON DELETE CASCADE,
  distribution_profile_id UUID REFERENCES public.distribution_profiles(id),
  recipients JSONB NOT NULL, -- Array of email addresses
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_brand_kits_org ON public.brand_kits(organization_name);
CREATE INDEX idx_meeting_exhibits_meeting ON public.meeting_exhibits(meeting_id);
CREATE INDEX idx_distribution_profiles_audience ON public.distribution_profiles(audience_type);
CREATE INDEX idx_pdf_generations_meeting ON public.pdf_generations(meeting_id);
CREATE INDEX idx_email_distributions_pdf ON public.email_distributions(pdf_generation_id);

-- RLS Policies
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_exhibits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_distributions ENABLE ROW LEVEL SECURITY;

-- Brand kits policies
CREATE POLICY "Anyone can view brand kits"
  ON public.brand_kits FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create brand kits"
  ON public.brand_kits FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update brand kits"
  ON public.brand_kits FOR UPDATE
  USING (auth.uid() = created_by);

-- Meeting exhibits policies
CREATE POLICY "Users can view exhibits from their meetings"
  ON public.meeting_exhibits FOR SELECT
  USING (meeting_id IN (
    SELECT meetings.id FROM meetings
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees
      WHERE meeting_attendees.meeting_id = meetings.id
    )
  ));

CREATE POLICY "Users can upload exhibits to their meetings"
  ON public.meeting_exhibits FOR INSERT
  WITH CHECK (uploaded_by = auth.uid() AND meeting_id IN (
    SELECT meetings.id FROM meetings
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees
      WHERE meeting_attendees.meeting_id = meetings.id
    )
  ));

-- Distribution profiles policies
CREATE POLICY "Users can view distribution profiles they created or are recipients of"
  ON public.distribution_profiles FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM distribution_recipients
      WHERE profile_id = distribution_profiles.id
    )
  );

CREATE POLICY "Users can create distribution profiles"
  ON public.distribution_profiles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update distribution profiles"
  ON public.distribution_profiles FOR UPDATE
  USING (auth.uid() = created_by);

-- Distribution recipients policies
CREATE POLICY "Users can view recipients of profiles they created"
  ON public.distribution_recipients FOR SELECT
  USING (profile_id IN (
    SELECT id FROM distribution_profiles WHERE created_by = auth.uid()
  ));

CREATE POLICY "Profile creators can add recipients"
  ON public.distribution_recipients FOR INSERT
  WITH CHECK (profile_id IN (
    SELECT id FROM distribution_profiles WHERE created_by = auth.uid()
  ));

-- PDF generations policies
CREATE POLICY "Users can view PDFs from their meetings"
  ON public.pdf_generations FOR SELECT
  USING (meeting_id IN (
    SELECT meetings.id FROM meetings
    WHERE auth.uid() IN (
      SELECT user_id FROM meeting_attendees
      WHERE meeting_attendees.meeting_id = meetings.id
    )
  ));

CREATE POLICY "Users can generate PDFs for their meetings"
  ON public.pdf_generations FOR INSERT
  WITH CHECK (auth.uid() = generated_by);

-- Email distributions policies
CREATE POLICY "Users can view their sent distributions"
  ON public.email_distributions FOR SELECT
  USING (auth.uid() = sent_by);

CREATE POLICY "Users can create email distributions"
  ON public.email_distributions FOR INSERT
  WITH CHECK (auth.uid() = sent_by);

-- Triggers for updated_at
CREATE TRIGGER update_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();