-- Create jitsi_recordings table to track conference recordings
CREATE TABLE IF NOT EXISTS public.jitsi_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  recording_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'completed', 'processing', 'failed')),
  recording_url TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jitsi_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for jitsi_recordings
CREATE POLICY "Users can view jitsi recordings for their meetings"
  ON public.jitsi_recordings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meeting_attendees ma
      WHERE ma.meeting_id = jitsi_recordings.meeting_id
      AND ma.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all jitsi recordings"
  ON public.jitsi_recordings
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_jitsi_recordings_meeting_id ON public.jitsi_recordings(meeting_id);
CREATE INDEX idx_jitsi_recordings_status ON public.jitsi_recordings(status);

-- Create trigger for updated_at
CREATE TRIGGER update_jitsi_recordings_updated_at
  BEFORE UPDATE ON public.jitsi_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();