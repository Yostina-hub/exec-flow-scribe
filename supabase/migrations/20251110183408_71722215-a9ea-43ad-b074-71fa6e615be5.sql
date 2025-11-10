-- Create notification_queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notification_queue
FOR SELECT
USING (auth.uid() = recipient_id);

-- Users can update their own notifications (for marking as read, etc.)
CREATE POLICY "Users can update their own notifications"
ON public.notification_queue
FOR UPDATE
USING (auth.uid() = recipient_id);

-- System/authenticated users can insert notifications
CREATE POLICY "Authenticated users can create notifications"
ON public.notification_queue
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notification_queue
FOR DELETE
USING (auth.uid() = recipient_id);

-- Create index for faster queries
CREATE INDEX idx_notification_queue_recipient_status 
ON public.notification_queue(recipient_id, status);

CREATE INDEX idx_notification_queue_created_at 
ON public.notification_queue(created_at DESC);