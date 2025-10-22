-- Create guest access requests table
CREATE TABLE public.guest_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, meeting_id)
);

-- Enable RLS
ALTER TABLE public.guest_access_requests ENABLE ROW LEVEL SECURITY;

-- Guests can view their own requests
CREATE POLICY "Users can view their own guest requests"
  ON public.guest_access_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Guests can create requests
CREATE POLICY "Users can create guest requests"
  ON public.guest_access_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all guest requests"
  ON public.guest_access_requests
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update guest requests"
  ON public.guest_access_requests
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_guest_access_requests_updated_at
  BEFORE UPDATE ON public.guest_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_guest_access_requests_status ON public.guest_access_requests(status);
CREATE INDEX idx_guest_access_requests_meeting_id ON public.guest_access_requests(meeting_id);