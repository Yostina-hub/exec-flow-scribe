-- Add status field to decisions table for voting workflow
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_vote' CHECK (status IN ('pending_vote', 'approved', 'rejected', 'archived'));

-- Create decision_votes table
CREATE TABLE IF NOT EXISTS decision_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject', 'abstain')),
  comment TEXT,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(decision_id, user_id)
);

-- Add RLS policies for decision_votes
ALTER TABLE decision_votes ENABLE ROW LEVEL SECURITY;

-- Meeting participants can view votes
CREATE POLICY "Meeting participants can view votes"
ON decision_votes FOR SELECT
USING (
  decision_id IN (
    SELECT d.id FROM decisions d
    WHERE d.meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  )
);

-- Meeting participants can cast their vote
CREATE POLICY "Meeting participants can vote"
ON decision_votes FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  decision_id IN (
    SELECT d.id FROM decisions d
    WHERE d.meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  )
);

-- Users can update their own votes
CREATE POLICY "Users can update their own votes"
ON decision_votes FOR UPDATE
USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_decision_votes_decision ON decision_votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_votes_user ON decision_votes(user_id);

-- Add function to auto-approve decisions based on votes
CREATE OR REPLACE FUNCTION check_decision_approval()
RETURNS TRIGGER AS $$
DECLARE
  total_attendees INTEGER;
  approve_votes INTEGER;
  reject_votes INTEGER;
  approval_threshold NUMERIC := 0.51; -- 51% approval needed
BEGIN
  -- Count total meeting attendees
  SELECT COUNT(*) INTO total_attendees
  FROM meeting_attendees ma
  JOIN decisions d ON d.meeting_id = ma.meeting_id
  WHERE d.id = NEW.decision_id;

  -- Count approve and reject votes
  SELECT 
    COUNT(*) FILTER (WHERE vote = 'approve'),
    COUNT(*) FILTER (WHERE vote = 'reject')
  INTO approve_votes, reject_votes
  FROM decision_votes
  WHERE decision_id = NEW.decision_id;

  -- Auto-approve if threshold met
  IF approve_votes::NUMERIC / total_attendees >= approval_threshold THEN
    UPDATE decisions SET status = 'approved' WHERE id = NEW.decision_id;
  -- Auto-reject if impossible to reach threshold
  ELSIF reject_votes::NUMERIC / total_attendees > (1 - approval_threshold) THEN
    UPDATE decisions SET status = 'rejected' WHERE id = NEW.decision_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-approval
DROP TRIGGER IF EXISTS trigger_check_decision_approval ON decision_votes;
CREATE TRIGGER trigger_check_decision_approval
AFTER INSERT OR UPDATE ON decision_votes
FOR EACH ROW
EXECUTE FUNCTION check_decision_approval();