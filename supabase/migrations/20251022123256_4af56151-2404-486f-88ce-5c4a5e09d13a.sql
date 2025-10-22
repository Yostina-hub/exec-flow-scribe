-- Helper function to avoid self-referential RLS recursion
create or replace function public.is_attendee(_meeting_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.meeting_attendees
    where meeting_id = _meeting_id and user_id = _user_id
  );
$$;

-- Ensure proper permissions to execute in policies
revoke all on function public.is_attendee(uuid, uuid) from public;
grant execute on function public.is_attendee(uuid, uuid) to anon, authenticated, service_role;

-- Replace recursive SELECT policy on meeting_attendees
drop policy if exists "Participants can view attendees of meetings they joined" on public.meeting_attendees;
create policy "Participants can view attendees of their meetings"
on public.meeting_attendees
for select
using (
  public.is_attendee(meeting_id, auth.uid())
  or user_id = auth.uid()
  or exists (
    select 1 from public.meetings m
    where m.id = meeting_attendees.meeting_id
      and m.created_by = auth.uid()
  )
);

-- Replace meetings SELECT policies that referenced meeting_attendees directly
drop policy if exists "Users can view meetings they attend or created" on public.meetings;
drop policy if exists "Users can view meetings they're attending" on public.meetings;
create policy "Users can view own or attending meetings"
on public.meetings
for select
using (
  created_by = auth.uid()
  or public.is_attendee(id, auth.uid())
);

-- Keep full row payloads for realtime on meeting_attendees (if not already set)
alter table public.meeting_attendees replica identity full;