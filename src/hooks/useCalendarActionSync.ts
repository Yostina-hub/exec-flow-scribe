import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Syncs action items with calendar events
 * Creates calendar reminders for due actions
 */
export const useCalendarActionSync = () => {
  useEffect(() => {
    const setupSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Listen for action item changes
      const channel = supabase
        .channel('action-calendar-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'action_items',
            filter: `assigned_to=eq.${user.id}`,
          },
          async (payload) => {
            await syncActionToCalendar(payload.new || payload.old);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSync();
  }, []);
};

/**
 * Sync an action item to calendar as a reminder
 */
const syncActionToCalendar = async (action: any) => {
  try {
    if (!action.due_date) return;

    // Check if user has calendar sync enabled
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('meeting_preferences')
      .eq('id', user.id)
      .single();

    const meetingPrefs = profile?.meeting_preferences as any;
    if (!meetingPrefs?.calendar_sync) return;

    // Create or update calendar event for action
    const dueDate = new Date(action.due_date);
    const eventTitle = `📋 Action Due: ${action.title}`;
    
    // Check if calendar event already exists
    const { data: existingEvents } = await supabase
      .from('meetings')
      .select('id')
      .eq('title', eventTitle)
      .eq('created_by', user.id)
      .maybeSingle();

    if (!existingEvents && action.status !== 'completed') {
      // Create new calendar event
      await supabase.from('meetings').insert({
        title: eventTitle,
        description: `Action item: ${action.description || action.title}\nPriority: ${action.priority}`,
        start_time: dueDate.toISOString(),
        end_time: new Date(dueDate.getTime() + 30 * 60000).toISOString(), // 30 min duration
        location: 'Action Reminder',
        status: 'scheduled',
        created_by: user.id,
        visibility: 'private',
      });

      console.log('Created calendar event for action:', action.id);
    }
  } catch (error) {
    console.error('Error syncing action to calendar:', error);
  }
};