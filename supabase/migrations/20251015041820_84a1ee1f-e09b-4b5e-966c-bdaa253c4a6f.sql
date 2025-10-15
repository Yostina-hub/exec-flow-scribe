-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE meeting_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE action_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE action_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE agenda_item_status AS ENUM ('pending', 'in_progress', 'completed');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  title TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  status meeting_status NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  recording_url TEXT,
  transcript_url TEXT,
  briefing_pack_url TEXT,
  minutes_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meeting attendees junction table
CREATE TABLE public.meeting_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_confirmed BOOLEAN DEFAULT false,
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Agenda items table
CREATE TABLE public.agenda_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  presenter_id UUID REFERENCES auth.users(id),
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL,
  status agenda_item_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action items table
CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  due_date DATE,
  priority action_priority NOT NULL DEFAULT 'medium',
  status action_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decisions table
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  decision_text TEXT NOT NULL,
  context TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transcriptions table
CREATE TABLE public.transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES auth.users(id),
  speaker_name TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  confidence_score NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Highlights table
CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for meetings
CREATE POLICY "Users can view meetings they're attending" ON public.meetings FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.meeting_attendees WHERE meeting_id = meetings.id
    ) OR created_by = auth.uid()
  );
CREATE POLICY "Users can create meetings" ON public.meetings FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Meeting creators can update" ON public.meetings FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Meeting creators can delete" ON public.meetings FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for meeting_attendees
CREATE POLICY "Users can view attendees of their meetings" ON public.meeting_attendees FOR SELECT 
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE auth.uid() IN (
      SELECT user_id FROM public.meeting_attendees WHERE meeting_id = meetings.id
    ))
  );
CREATE POLICY "Meeting creators can manage attendees" ON public.meeting_attendees FOR ALL 
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE created_by = auth.uid())
  );

-- RLS Policies for agenda_items
CREATE POLICY "Users can view agenda for their meetings" ON public.agenda_items FOR SELECT 
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE auth.uid() IN (
      SELECT user_id FROM public.meeting_attendees WHERE meeting_id = meetings.id
    ))
  );
CREATE POLICY "Meeting creators can manage agenda" ON public.agenda_items FOR ALL 
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE created_by = auth.uid())
  );

-- RLS Policies for action_items
CREATE POLICY "Users can view their action items" ON public.action_items FOR SELECT 
  USING (assigned_to = auth.uid() OR created_by = auth.uid());
CREATE POLICY "Users can create action items" ON public.action_items FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Assignees can update their actions" ON public.action_items FOR UPDATE 
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- RLS Policies for decisions
CREATE POLICY "Users can view decisions from their meetings" ON public.decisions FOR SELECT 
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE auth.uid() IN (
      SELECT user_id FROM public.meeting_attendees WHERE meeting_id = meetings.id
    ))
  );
CREATE POLICY "Users can create decisions" ON public.decisions FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for transcriptions
CREATE POLICY "Users can view transcriptions from their meetings" ON public.transcriptions FOR SELECT 
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE auth.uid() IN (
      SELECT user_id FROM public.meeting_attendees WHERE meeting_id = meetings.id
    ))
  );
CREATE POLICY "System can insert transcriptions" ON public.transcriptions FOR INSERT WITH CHECK (true);

-- RLS Policies for highlights
CREATE POLICY "Users can view highlights from their meetings" ON public.highlights FOR SELECT 
  USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE auth.uid() IN (
      SELECT user_id FROM public.meeting_attendees WHERE meeting_id = meetings.id
    ))
  );
CREATE POLICY "Users can create highlights" ON public.highlights FOR INSERT WITH CHECK (auth.uid() = tagged_by);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON public.agenda_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON public.action_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();