-- Phase 5: Advanced Collaboration Features

-- Create polls table for live voting during meetings
CREATE TABLE public.meeting_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  question text NOT NULL,
  poll_type text NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, yes_no, rating
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_multiple boolean DEFAULT false,
  anonymous boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft', -- draft, active, closed
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create poll responses table
CREATE TABLE public.poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.meeting_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  selected_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  response_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create collaborative notes table
CREATE TABLE public.meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  note_type text NOT NULL DEFAULT 'general', -- general, action, decision, question
  content text NOT NULL,
  timestamp_reference timestamp with time zone,
  is_pinned boolean DEFAULT false,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create note reactions table
CREATE TABLE public.note_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.meeting_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL, -- thumbs_up, heart, question, important
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(note_id, user_id, reaction_type)
);

-- Create meeting bookmarks table for quick navigation in recordings
CREATE TABLE public.meeting_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  timestamp_seconds integer NOT NULL,
  description text,
  bookmark_type text NOT NULL DEFAULT 'general', -- general, decision, action, highlight
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.meeting_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_polls
CREATE POLICY "Meeting participants can view polls"
ON public.meeting_polls
FOR SELECT
USING (meeting_id IN (
  SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
));

CREATE POLICY "Meeting creators can manage polls"
ON public.meeting_polls
FOR ALL
USING (created_by = auth.uid());

-- RLS Policies for poll_responses
CREATE POLICY "Users can view poll responses"
ON public.poll_responses
FOR SELECT
USING (
  poll_id IN (
    SELECT id FROM meeting_polls 
    WHERE meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can submit their own poll responses"
ON public.poll_responses
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own poll responses"
ON public.poll_responses
FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for meeting_notes
CREATE POLICY "Meeting participants can view notes"
ON public.meeting_notes
FOR SELECT
USING (meeting_id IN (
  SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create notes"
ON public.meeting_notes
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own notes"
ON public.meeting_notes
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own notes"
ON public.meeting_notes
FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for note_reactions
CREATE POLICY "Meeting participants can view reactions"
ON public.note_reactions
FOR SELECT
USING (
  note_id IN (
    SELECT id FROM meeting_notes 
    WHERE meeting_id IN (
      SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage their own reactions"
ON public.note_reactions
FOR ALL
USING (user_id = auth.uid());

-- RLS Policies for meeting_bookmarks
CREATE POLICY "Meeting participants can view bookmarks"
ON public.meeting_bookmarks
FOR SELECT
USING (meeting_id IN (
  SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create bookmarks"
ON public.meeting_bookmarks
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  meeting_id IN (
    SELECT meeting_id FROM meeting_attendees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own bookmarks"
ON public.meeting_bookmarks
FOR DELETE
USING (created_by = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_meeting_polls_updated_at
BEFORE UPDATE ON public.meeting_polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_notes_updated_at
BEFORE UPDATE ON public.meeting_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_meeting_polls_meeting_id ON public.meeting_polls(meeting_id);
CREATE INDEX idx_meeting_polls_status ON public.meeting_polls(status);
CREATE INDEX idx_poll_responses_poll_id ON public.poll_responses(poll_id);
CREATE INDEX idx_meeting_notes_meeting_id ON public.meeting_notes(meeting_id);
CREATE INDEX idx_meeting_notes_type ON public.meeting_notes(note_type);
CREATE INDEX idx_note_reactions_note_id ON public.note_reactions(note_id);
CREATE INDEX idx_meeting_bookmarks_meeting_id ON public.meeting_bookmarks(meeting_id);

-- Enable realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_bookmarks;