-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.distribution_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}'::jsonb,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create webhook delivery log table
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.distribution_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_webhooks_active ON public.distribution_webhooks(is_active);
CREATE INDEX idx_webhooks_events ON public.distribution_webhooks USING GIN(events);
CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(response_status);
CREATE INDEX idx_webhook_deliveries_retry ON public.webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.distribution_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks
CREATE POLICY "Admins can manage webhooks"
  ON public.distribution_webhooks
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view webhooks"
  ON public.distribution_webhooks
  FOR SELECT
  USING (true);

-- RLS Policies for webhook deliveries
CREATE POLICY "Admins can view webhook deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can manage webhook deliveries"
  ON public.webhook_deliveries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_distribution_webhooks_updated_at
  BEFORE UPDATE ON public.distribution_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_deliveries;