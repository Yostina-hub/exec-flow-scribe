-- Create document_versions table for version control
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('minutes', 'agenda', 'transcript', 'summary', 'report')),
  version_number INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown', 'html', 'json', 'pdf')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  change_summary TEXT,
  file_url TEXT,
  file_size_bytes INTEGER,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(meeting_id, document_type, version_number)
);

-- Create distribution_channels table for multi-channel distribution
CREATE TABLE IF NOT EXISTS public.distribution_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'slack', 'teams', 'whatsapp', 'webhook', 'drive')),
  is_active BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create document_distributions table
CREATE TABLE IF NOT EXISTS public.document_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.distribution_channels(id) ON DELETE CASCADE,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  delivery_confirmation JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meeting_integrations table
CREATE TABLE IF NOT EXISTS public.meeting_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('google_drive', 'google_meet', 'zoom', 'teams', 'slack', 'jira', 'asana')),
  external_id TEXT NOT NULL,
  external_url TEXT,
  sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'failed')),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(meeting_id, integration_type, external_id)
);

-- Create automated_workflows table
CREATE TABLE IF NOT EXISTS public.automated_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('meeting_end', 'minutes_approved', 'action_overdue', 'custom')),
  trigger_config JSONB DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_versions
CREATE POLICY "Users can view document versions from their meetings"
  ON public.document_versions FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create document versions for their meetings"
  ON public.document_versions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update their document versions"
  ON public.document_versions FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for distribution_channels
CREATE POLICY "Users can view distribution channels"
  ON public.distribution_channels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage distribution channels"
  ON public.distribution_channels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    )
  );

-- RLS Policies for document_distributions
CREATE POLICY "Users can view distributions for their documents"
  ON public.document_distributions FOR SELECT
  USING (
    document_version_id IN (
      SELECT id FROM document_versions 
      WHERE meeting_id IN (
        SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create distributions"
  ON public.document_distributions FOR INSERT
  WITH CHECK (
    document_version_id IN (
      SELECT id FROM document_versions WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for meeting_integrations
CREATE POLICY "Users can view integrations for their meetings"
  ON public.meeting_integrations FOR SELECT
  USING (
    meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can manage integrations"
  ON public.meeting_integrations FOR ALL
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for automated_workflows
CREATE POLICY "Users can view workflows"
  ON public.automated_workflows FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage workflows"
  ON public.automated_workflows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_distributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_integrations;

-- Create indexes
CREATE INDEX idx_document_versions_meeting_id ON public.document_versions(meeting_id);
CREATE INDEX idx_document_versions_created_by ON public.document_versions(created_by);
CREATE INDEX idx_document_distributions_version_id ON public.document_distributions(document_version_id);
CREATE INDEX idx_meeting_integrations_meeting_id ON public.meeting_integrations(meeting_id);
CREATE INDEX idx_automated_workflows_trigger ON public.automated_workflows(trigger_type) WHERE is_active = true;