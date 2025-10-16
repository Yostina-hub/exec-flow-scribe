import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Central notification dispatcher
 * Handles all app notifications based on user preferences
 */
export const useNotificationDispatcher = () => {
  const { toast } = useToast();

  useEffect(() => {
    const setupNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Listen for notification events
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'event_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            await handleNotification(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'executive_coach_hints',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            showCoachHint(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupNotifications();
  }, [toast]);

  const handleNotification = async (notification: any) => {
    try {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('title, start_time')
        .eq('id', notification.meeting_id)
        .single();

      if (meeting) {
        const minutesUntil = notification.offset_minutes;
        toast({
          title: '📅 Meeting Reminder',
          description: `${meeting.title} starts in ${minutesUntil} minutes`,
        });
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const showCoachHint = (hint: any) => {
    toast({
      title: '💡 Executive Coach',
      description: hint.hint_message,
      duration: 8000,
    });
  };
};