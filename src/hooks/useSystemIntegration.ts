import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Central integration hook that connects all systems
 * Handles real-time events and triggers automated workflows
 */
export const useSystemIntegration = () => {

  useEffect(() => {
    const setupIntegrations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Meeting lifecycle integration
      const meetingsChannel = supabase
        .channel('meetings-integration')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meetings',
            filter: `created_by=eq.${user.id}`,
          },
          async (payload) => {
            console.log('New meeting created, triggering integrations:', payload);
            await handleMeetingCreated(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'meetings',
            filter: `created_by=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Meeting updated, checking for integrations:', payload);
            await handleMeetingUpdated(payload.new, payload.old);
          }
        )
        .subscribe();

      // Action items integration
      const actionsChannel = supabase
        .channel('actions-integration')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'action_items',
            filter: `assigned_to=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Action item updated, triggering integrations:', payload);
            await handleActionUpdated(payload.new, payload.old);
          }
        )
        .subscribe();

      // Transcription completion integration
      const transcriptionChannel = supabase
        .channel('transcription-integration')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transcription_segments',
          },
          async (payload) => {
            console.log('Transcription segment added:', payload);
            await handleTranscriptionProgress(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(meetingsChannel);
        supabase.removeChannel(actionsChannel);
        supabase.removeChannel(transcriptionChannel);
      };
    };

    setupIntegrations();
  }, []);
};

/**
 * Handle meeting creation - trigger calendar sync, notifications, context generation
 */
const handleMeetingCreated = async (meeting: any) => {
  try {
    console.log('Processing new meeting integration:', meeting);

    // Generate context capsules for attendees
    const { data: attendees } = await supabase
      .from('meeting_attendees')
      .select('user_id')
      .eq('meeting_id', meeting.id);

    if (attendees && attendees.length > 0) {
      console.log('Generating context capsules for attendees');
      await supabase.functions.invoke('generate-context-capsule', {
        body: { 
          meeting_id: meeting.id,
          attendee_ids: attendees.map(a => a.user_id)
        }
      });
    }

    // Create event notifications for attendees
    if (attendees) {
      const notificationPromises = attendees.map(async (attendee) => {
        const { data: prefs } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', attendee.user_id)
          .single();

        const notificationPrefs = prefs?.notification_preferences as any;
        if (notificationPrefs?.meeting_reminders !== false) {
          const reminderMinutes = notificationPrefs?.reminder_timing || 15;
          
          await supabase.from('event_notifications').insert({
            meeting_id: meeting.id,
            user_id: attendee.user_id,
            channel: 'email',
            offset_minutes: reminderMinutes,
          });
        }
      });

      await Promise.all(notificationPromises);
    }

    console.log('Meeting creation integrations completed');
  } catch (error) {
    console.error('Error in meeting creation integration:', error);
  }
};

/**
 * Handle meeting updates - trigger AI processing when meeting completes
 */
const handleMeetingUpdated = async (newMeeting: any, oldMeeting: any) => {
  try {
    // Check if meeting just completed
    if (oldMeeting.status !== 'completed' && newMeeting.status === 'completed') {
      console.log('Meeting completed, triggering AI processing pipeline');

      // Trigger AI analysis pipeline
      await triggerAIProcessingPipeline(newMeeting.id);
    }
  } catch (error) {
    console.error('Error in meeting update integration:', error);
  }
};

/**
 * Trigger complete AI processing pipeline for a meeting
 */
const triggerAIProcessingPipeline = async (meetingId: string) => {
  try {
    console.log('✨ Starting AI processing pipeline for meeting:', meetingId);

    // Get auth session for proper authorization
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No active session for AI processing');
      return;
    }

    // 1. Generate minutes with proper authorization and error handling
    console.log('📝 Generating meeting minutes...');
    const { data: minutesData, error: minutesError } = await supabase.functions.invoke('generate-minutes', {
      body: { meeting_id: meetingId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (minutesError) {
      console.error('❌ Error generating minutes:', minutesError);
      const msg = (minutesError as any)?.message || String(minutesError);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Minutes generation failed',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 9000,
      });
      console.log('⚠️ Continuing with other AI processing tasks...');
    } else {
      console.log('✅ Minutes generated successfully');
    }

    // 2. Analyze sentiment
    const { error: sentimentError } = await supabase.functions.invoke('analyze-meeting-sentiment', {
      body: { meeting_id: meetingId }
    });
    if (sentimentError) {
      const msg = (sentimentError as any)?.message || String(sentimentError);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Sentiment analysis failed',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 9000,
      });
    } else {
      console.log('Sentiment analysis completed');
    }

    // 3. Generate executive briefs
    const { data: attendees } = await supabase
      .from('meeting_attendees')
      .select('user_id')
      .eq('meeting_id', meetingId);

    if (attendees) {
      const { error: briefError } = await supabase.functions.invoke('generate-executive-brief', {
        body: { 
          meeting_id: meetingId,
          user_ids: attendees.map(a => a.user_id)
        }
      });
      if (briefError) {
        const msg = (briefError as any)?.message || String(briefError);
        const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
        const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
        toast({
          title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Executive brief failed',
          description: is402
            ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
            : is429
            ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
            : msg,
          variant: 'destructive',
          duration: 9000,
        });
      } else {
        console.log('Executive briefs generated');
      }
    }

    console.log('Executive briefs generated');

    // 4. Generate coach hints
    const { error: coachError } = await supabase.functions.invoke('generate-coach-hints', {
      body: { meeting_id: meetingId }
    });
    if (coachError) {
      const msg = (coachError as any)?.message || String(coachError);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Coach hints failed',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 9000,
      });
    } else {
      console.log('Coach hints generated');
    }

    console.log('AI processing pipeline completed successfully');

    // Notify attendees that minutes are ready
    await notifyMinutesReady(meetingId);
  } catch (error) {
    console.error('Error in AI processing pipeline:', error);
  }
};

/**
 * Notify attendees when minutes are ready
 */
const notifyMinutesReady = async (meetingId: string) => {
  try {
    const { data: attendees } = await supabase
      .from('meeting_attendees')
      .select('user_id')
      .eq('meeting_id', meetingId);

    if (attendees) {
      for (const attendee of attendees) {
        const { data: prefs } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', attendee.user_id)
          .single();

        const notificationPrefs = prefs?.notification_preferences as any;
        if (notificationPrefs?.minutes_ready !== false) {
          // Trigger notification (would integrate with SMTP settings)
          console.log('Minutes ready notification for user:', attendee.user_id);
        }
      }
    }
  } catch (error) {
    console.error('Error notifying minutes ready:', error);
  }
};

/**
 * Handle action item updates - trigger escalations if needed
 */
const handleActionUpdated = async (newAction: any, oldAction: any) => {
  try {
    // Check if action became overdue or blocked
    const shouldEscalate = 
      (oldAction.status !== 'blocked' && newAction.status === 'blocked') ||
      (newAction.due_date && new Date(newAction.due_date) < new Date() && newAction.status === 'pending');

    if (shouldEscalate) {
      console.log('Action requires escalation:', newAction.id);
      
      await supabase.functions.invoke('check-escalations', {
        body: { action_id: newAction.id }
      });
    }

    // Check if action completed
    if (oldAction.status !== 'completed' && newAction.status === 'completed') {
      console.log('Action completed, updating related meetings');
      
      // Update meeting completion tracking
      if (newAction.meeting_id) {
        await updateMeetingProgress(newAction.meeting_id);
      }
    }
  } catch (error) {
    console.error('Error in action update integration:', error);
  }
};

/**
 * Update meeting progress based on action completion
 */
const updateMeetingProgress = async (meetingId: string) => {
  try {
    const { data: actions } = await supabase
      .from('action_items')
      .select('status')
      .eq('meeting_id', meetingId);

    if (actions) {
      const completed = actions.filter(a => a.status === 'completed').length;
      const total = actions.length;
      const progress = total > 0 ? (completed / total) * 100 : 0;

      console.log(`Meeting ${meetingId} progress: ${progress}%`);
      
      // Could update a progress field or trigger notifications
    }
  } catch (error) {
    console.error('Error updating meeting progress:', error);
  }
};

/**
 * Handle transcription progress - check if complete to trigger processing
 */
const handleTranscriptionProgress = async (segment: any) => {
  try {
    // Check if this completes the transcription
    const { data: meeting } = await supabase
      .from('meetings')
      .select('status')
      .eq('id', segment.meeting_id)
      .single();

    if (meeting?.status === 'in_progress') {
      console.log('Transcription in progress for meeting:', segment.meeting_id);
      // Real-time transcription updates would be handled here
    }
  } catch (error) {
    console.error('Error handling transcription progress:', error);
  }
};