-- Create pending_distributions table
CREATE TABLE IF NOT EXISTS public.pending_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  signature_request_id UUID REFERENCES public.signature_requests(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own pending distributions"
  ON public.pending_distributions
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own pending distributions"
  ON public.pending_distributions
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can update their own pending distributions"
  ON public.pending_distributions
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own pending distributions"
  ON public.pending_distributions
  FOR DELETE
  USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_pending_distributions_updated_at
  BEFORE UPDATE ON public.pending_distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_pending_distributions_created_by ON public.pending_distributions(created_by);
CREATE INDEX idx_pending_distributions_status ON public.pending_distributions(status);
CREATE INDEX idx_pending_distributions_meeting_id ON public.pending_distributions(meeting_id);