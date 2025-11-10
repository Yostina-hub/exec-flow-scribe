-- Add priority and urgency fields to notebook_intelligence_insights
ALTER TABLE notebook_intelligence_insights
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requires_action BOOLEAN DEFAULT true;

-- Create an index for faster querying
CREATE INDEX IF NOT EXISTS idx_insights_priority ON notebook_intelligence_insights(priority_score DESC, urgency_level);
CREATE INDEX IF NOT EXISTS idx_insights_deadline ON notebook_intelligence_insights(response_deadline) WHERE response_deadline IS NOT NULL;