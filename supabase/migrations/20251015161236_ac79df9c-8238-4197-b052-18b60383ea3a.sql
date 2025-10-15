-- Create table for storing multiple transcript versions
CREATE TABLE public.transcript_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL, -- stores full transcript with timestamps and speaker info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(meeting_id, version_number)
);

-- Create table for minutes editing history (audit trail)
CREATE TABLE public.minutes_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  changes_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_ratified BOOLEAN DEFAULT false,
  ratified_at TIMESTAMP WITH TIME ZONE,
  ratified_by UUID REFERENCES auth.users(id),
  UNIQUE(meeting_id, version_number)
);

-- Create table for fact-check results
CREATE TABLE public.fact_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  transcript_segment TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_result JSONB NOT NULL, -- stores contradictions, missing context, related decisions
  status TEXT NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create table for media files (immutable vault)
CREATE TABLE public.meeting_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- audio, video, screen_recording
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  format TEXT,
  checksum TEXT NOT NULL, -- for immutability verification
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  metadata JSONB -- stores waveform data, frame thumbnails, etc.
);

-- Create table for participant confirmation requests
CREATE TABLE public.confirmation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transcript_segment TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, disputed
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.transcript_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transcript_versions
CREATE POLICY "Users can view transcript versions for their meetings"
  ON public.transcript_versions FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can create transcript versions for their meetings"
  ON public.transcript_versions FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

-- RLS Policies for minutes_versions
CREATE POLICY "Users can view minutes versions for their meetings"
  ON public.minutes_versions FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can create minutes versions for their meetings"
  ON public.minutes_versions FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can update minutes versions they created"
  ON public.minutes_versions FOR UPDATE
  USING (created_by = auth.uid());

-- RLS Policies for fact_checks
CREATE POLICY "Users can view fact checks for their meetings"
  ON public.fact_checks FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can create fact checks for their meetings"
  ON public.fact_checks FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can update fact checks they reviewed"
  ON public.fact_checks FOR UPDATE
  USING (reviewed_by = auth.uid() OR reviewed_by IS NULL);

-- RLS Policies for meeting_media
CREATE POLICY "Users can view media for their meetings"
  ON public.meeting_media FOR SELECT
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can upload media for their meetings"
  ON public.meeting_media FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

-- RLS Policies for confirmation_requests
CREATE POLICY "Users can view their confirmation requests"
  ON public.confirmation_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create confirmation requests"
  ON public.confirmation_requests FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.meeting_attendees 
        WHERE meeting_id = meetings.id
      )
    )
  );

CREATE POLICY "Users can respond to their confirmation requests"
  ON public.confirmation_requests FOR UPDATE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_transcript_versions_meeting ON public.transcript_versions(meeting_id);
CREATE INDEX idx_minutes_versions_meeting ON public.minutes_versions(meeting_id);
CREATE INDEX idx_fact_checks_meeting ON public.fact_checks(meeting_id);
CREATE INDEX idx_meeting_media_meeting ON public.meeting_media(meeting_id);
CREATE INDEX idx_confirmation_requests_user ON public.confirmation_requests(user_id);
CREATE INDEX idx_confirmation_requests_status ON public.confirmation_requests(status);