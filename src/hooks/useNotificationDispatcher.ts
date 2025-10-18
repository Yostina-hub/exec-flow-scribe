import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SendNotificationParams {
  to: string;
  subject: string;
  html: string;
  type: "meeting_reminder" | "action_item_update" | "minutes_ready" | "confirmation" | "notification";
}

/**
 * Central notification dispatcher
 * Handles all app notifications based on user preferences and email delivery
 */
export const useNotificationDispatcher = () => {

  const sendEmail = async (params: SendNotificationParams) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-notification-email",
        {
          body: params,
        }
      );

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Email Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const sendMeetingReminder = async (
    email: string,
    meetingTitle: string,
    startTime: string,
    location: string
  ) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; margin: 10px 0; }
            .detail-label { font-weight: bold; min-width: 100px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Meeting Reminder</h1>
            </div>
            <div class="content">
              <p>You have an upcoming meeting:</p>
              <div class="meeting-details">
                <div class="detail-row">
                  <span class="detail-label">Meeting:</span>
                  <span>${meetingTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span>${new Date(startTime).toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Location:</span>
                  <span>${location}</span>
                </div>
              </div>
              <p>Please make sure you're prepared and on time.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: email,
      subject: `Reminder: ${meetingTitle}`,
      html,
      type: "meeting_reminder",
    });
  };

  const sendActionItemUpdate = async (
    email: string,
    actionTitle: string,
    status: string,
    dueDate: string
  ) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .action-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-in-progress { background: #dbeafe; color: #1e40af; }
            .status-completed { background: #d1fae5; color: #065f46; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Action Item Update</h1>
            </div>
            <div class="content">
              <div class="action-details">
                <h2>${actionTitle}</h2>
                <p><span class="status-badge status-${status}">${status.toUpperCase()}</span></p>
                <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
              </div>
              <p>Your action item has been updated. Please review and take necessary actions.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: email,
      subject: `Action Item Update: ${actionTitle}`,
      html,
      type: "action_item_update",
    });
  };

  const sendMinutesReady = async (
    email: string,
    meetingTitle: string,
    minutesUrl: string
  ) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4facfe; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Meeting Minutes Ready</h1>
            </div>
            <div class="content">
              <p>The minutes for <strong>${meetingTitle}</strong> are now available.</p>
              <a href="${minutesUrl}" class="button">View Minutes</a>
              <p style="margin-top: 20px;">Thank you for your participation.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: email,
      subject: `Minutes Ready: ${meetingTitle}`,
      html,
      type: "minutes_ready",
    });
  };

  const sendConfirmationRequest = async (
    email: string,
    meetingTitle: string,
    transcriptSegment: string,
    confirmationUrl: string
  ) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .transcript { background: white; padding: 20px; border-left: 4px solid #fa709a; margin: 20px 0; font-style: italic; }
            .button { display: inline-block; background: #fa709a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirmation Required</h1>
            </div>
            <div class="content">
              <p>Please confirm the following statement from <strong>${meetingTitle}</strong>:</p>
              <div class="transcript">"${transcriptSegment}"</div>
              <a href="${confirmationUrl}" class="button">Confirm or Update</a>
            </div>
          </div>
        </body>
      </html>
    `;

    return sendEmail({
      to: email,
      subject: `Confirmation Needed: ${meetingTitle}`,
      html,
      type: "confirmation",
    });
  };

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
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_logs',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.is_urgent) {
              toast({
                title: '🚨 Urgent Communication',
                description: payload.new.content?.substring(0, 100) || 'New urgent message received',
                variant: 'destructive',
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'message_logs',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.escalation_level === 2) {
              toast({
                title: '⚠️ Message Escalated to SMS',
                description: 'An urgent message has been escalated to SMS',
              });
            } else if (payload.new.escalation_level === 3) {
              toast({
                title: '📞 Call Initiated',
                description: 'A critical message has been escalated to a phone call',
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupNotifications();
  }, []);

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

  const checkEscalations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-escalations');
      
      if (error) throw error;
      
      if (data.escalations_triggered > 0) {
        toast({
          title: 'Escalations Processed',
          description: `${data.escalations_triggered} messages escalated`,
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error checking escalations:', error);
      toast({
        title: 'Error',
        description: 'Failed to check for escalations',
        variant: 'destructive',
      });
    }
  };

  return {
    sendEmail,
    sendMeetingReminder,
    sendActionItemUpdate,
    sendMinutesReady,
    sendConfirmationRequest,
    checkEscalations,
  };
};