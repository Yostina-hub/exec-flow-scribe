import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook that listens for new meeting minutes and auto-generates Guba tasks
 * if the user has auto-generation enabled in their settings
 */
export const useGubaAutoGeneration = () => {
  const { toast } = useToast();

  useEffect(() => {
    const checkAndGenerate = async (minutesId: string, meetingId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has Guba enabled and auto-generation turned on
        const { data: settings } = await supabase
          .from('guba_settings')
          .select('enabled, auto_generate_on_minutes, preferred_language')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!settings?.enabled || !settings?.auto_generate_on_minutes) {
          return; // Auto-generation is disabled
        }

        // Check if a proposal already exists for this meeting
        const { data: existingProposal } = await supabase
          .from('guba_task_proposals')
          .select('id')
          .eq('meeting_id', meetingId)
          .eq('source_type', 'minutes')
          .maybeSingle();

        if (existingProposal) {
          return; // Already generated
        }

        console.log('Auto-generating Guba tasks for meeting:', meetingId);

        // Trigger task generation
        const { data, error } = await supabase.functions.invoke('generate-guba-tasks', {
          body: {
            meeting_id: meetingId,
            source_type: 'minutes',
            source_id: minutesId,
            language: settings.preferred_language || 'en',
            user_id: user.id
          }
        });

        if (error) throw error;

        toast({
          title: "🎉 Guba AI Generated Tasks!",
          description: `${data.tasks.length} actionable tasks created automatically from meeting minutes.`,
        });

      } catch (error) {
        console.error('Error in Guba auto-generation:', error);
        // Silently fail - don't interrupt user workflow
      }
    };

    // Listen for new meeting minutes
    const channel = supabase
      .channel('guba-auto-generation')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_minutes'
        },
        (payload) => {
          console.log('New meeting minutes detected:', payload.new);
          const newMinutes = payload.new as any;
          if (newMinutes.id && newMinutes.meeting_id) {
            checkAndGenerate(newMinutes.id, newMinutes.meeting_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
};
