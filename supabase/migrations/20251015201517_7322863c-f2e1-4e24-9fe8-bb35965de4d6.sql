-- Seed sample data using security definer to bypass RLS
CREATE OR REPLACE FUNCTION public.seed_sample_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_meeting_ids uuid[];
  v_action_ids uuid[];
  i int;
BEGIN
  -- Get first user from profiles
  SELECT id INTO v_user_id FROM public.profiles ORDER BY created_at LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table';
  END IF;

  -- Insert sample meetings and collect IDs
  WITH inserted_meetings AS (
    INSERT INTO public.meetings (title, description, start_time, end_time, location, status, created_by)
    VALUES
      ('Executive Strategy Review', 'Quarterly strategy alignment and planning session', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '3.5 hours', 'Board Room', 'scheduled', v_user_id),
      ('Weekly Operations Sync', 'Regular operations update and issue resolution', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 45 minutes', 'Conference Room B', 'scheduled', v_user_id),
      ('Quarterly Planning Session', 'Q1 2025 planning and objective setting', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours', 'Conference Room A', 'scheduled', v_user_id),
      ('Product Roadmap Discussion', 'Review and prioritize product initiatives', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 1 hour', 'Virtual', 'scheduled', v_user_id),
      ('Leadership Team Meeting', 'Monthly leadership sync and updates', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '2 hours', 'Board Room', 'completed', v_user_id),
      ('Investor Relations Call', 'Quarterly investor update presentation', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour', 'Virtual', 'completed', v_user_id),
      ('Budget Review Meeting', 'Annual budget review and approval', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '1.5 hours', 'Conference Room A', 'completed', v_user_id)
    RETURNING id
  )
  SELECT array_agg(id) INTO v_meeting_ids FROM inserted_meetings;

  -- Insert meeting attendees for all meetings
  FOR i IN 1..array_length(v_meeting_ids, 1) LOOP
    INSERT INTO public.meeting_attendees (meeting_id, user_id, attended)
    VALUES (v_meeting_ids[i], v_user_id, i > 4); -- First 4 are upcoming, rest are attended
  END LOOP;

  -- Insert sample action items
  INSERT INTO public.action_items (title, description, meeting_id, assigned_to, created_by, due_date, priority, status)
  VALUES
    ('Review Q4 financial projections', 'Complete detailed review of Q4 financial forecasts and projections', v_meeting_ids[1], v_user_id, v_user_id, CURRENT_DATE, 'high', 'in_progress'),
    ('Finalize hiring plan for 2025', 'Complete and approve the 2025 hiring plan with budget allocation', v_meeting_ids[3], v_user_id, v_user_id, CURRENT_DATE + 2, 'medium', 'pending'),
    ('Approve marketing budget', 'Review and approve Q1 marketing budget and campaign plans', v_meeting_ids[7], v_user_id, v_user_id, CURRENT_DATE + 4, 'high', 'pending'),
    ('Schedule investor presentations', 'Coordinate and schedule Q1 investor presentation meetings', v_meeting_ids[6], v_user_id, v_user_id, CURRENT_DATE + 7, 'medium', 'in_progress'),
    ('Update product roadmap document', 'Finalize Q1 product roadmap with feature priorities', v_meeting_ids[4], v_user_id, v_user_id, CURRENT_DATE + 1, 'high', 'in_progress'),
    ('Prepare board presentation', 'Create comprehensive board presentation for next meeting', v_meeting_ids[5], v_user_id, v_user_id, CURRENT_DATE + 5, 'high', 'pending'),
    ('Review vendor contracts', 'Complete review of all vendor contracts for renewal', v_meeting_ids[7], v_user_id, v_user_id, CURRENT_DATE - 3, 'medium', 'completed'),
    ('Conduct team performance reviews', 'Complete Q4 performance reviews for all direct reports', v_meeting_ids[5], v_user_id, v_user_id, CURRENT_DATE - 8, 'medium', 'completed');

  -- Insert sample agenda items
  INSERT INTO public.agenda_items (meeting_id, title, description, duration_minutes, order_index, status, presenter_id)
  VALUES
    (v_meeting_ids[1], 'Strategy Review', 'Quarterly strategy discussion', 30, 1, 'pending', v_user_id),
    (v_meeting_ids[1], 'Q4 Results', 'Review Q4 performance', 20, 2, 'pending', v_user_id),
    (v_meeting_ids[2], 'Operations Update', 'Weekly status review', 25, 1, 'pending', v_user_id),
    (v_meeting_ids[3], 'Q1 Planning', 'Next quarter planning', 45, 1, 'pending', v_user_id);

  RAISE NOTICE 'Sample data seeded successfully for user %', v_user_id;
END;
$$;

-- Execute the seeding function
SELECT public.seed_sample_data();