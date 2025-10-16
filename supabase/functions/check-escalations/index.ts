import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get active escalation rules
    const { data: rules, error: rulesError } = await supabaseClient
      .from('escalation_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority_level', { ascending: true });

    if (rulesError) {
      console.error('Error fetching escalation rules:', rulesError);
      throw rulesError;
    }

    // Get unread urgent messages that need escalation
    const { data: messages, error: messagesError } = await supabaseClient
      .from('message_logs')
      .select('*, profiles!message_logs_user_id_fkey(email, full_name, phone)')
      .eq('is_urgent', true)
      .eq('status', 'sent')
      .is('read_at', null)
      .lt('escalation_level', 3);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    console.log(`Found ${messages?.length || 0} messages to check for escalation`);

    const escalations = [];

    for (const message of messages || []) {
      const sentAt = new Date(message.sent_at);
      const now = new Date();
      const minutesElapsed = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60));

      // Find applicable escalation rule
      const applicableRule = rules?.find(rule => 
        rule.priority_level > (message.escalation_level || 0) &&
        minutesElapsed >= rule.wait_time_minutes
      );

      if (applicableRule) {
        console.log(`Escalating message ${message.id} to level ${applicableRule.priority_level}`);

        // Update message escalation level
        await supabaseClient
          .from('message_logs')
          .update({
            escalation_level: applicableRule.priority_level,
            escalated_at: new Date().toISOString()
          })
          .eq('id', message.id);

        const userPhone = message.profiles?.phone;
        if (!userPhone) {
          console.log(`No phone number for user ${message.user_id}`);
          continue;
        }

        // Escalate based on type
        if (applicableRule.escalate_to === 'sms' && applicableRule.priority_level === 2) {
          // Send SMS
          try {
            const { data: smsResult, error: smsError } = await supabaseClient.functions.invoke('send-sms', {
              body: {
                recipient_phone: userPhone,
                message: `URGENT: ${message.content}\n\nPlease respond immediately.`,
                user_id: message.user_id,
                meeting_id: message.meeting_id,
                message_type: 'urgent',
                is_urgent: true
              }
            });

            if (smsError) {
              console.error('SMS escalation failed:', smsError);
            } else {
              console.log('SMS escalation sent:', smsResult);
              escalations.push({ type: 'sms', message_id: message.id, status: 'sent' });
            }
          } catch (error) {
            console.error('Error sending SMS:', error);
          }
        } else if (applicableRule.escalate_to === 'call' && applicableRule.priority_level === 3) {
          // Initiate call
          try {
            const { data: callResult, error: callError } = await supabaseClient.functions.invoke('initiate-call', {
              body: {
                recipient_phone: userPhone,
                message: message.content,
                user_id: message.user_id,
                meeting_id: message.meeting_id,
                call_type: 'escalation',
                message_log_id: message.id
              }
            });

            if (callError) {
              console.error('Call escalation failed:', callError);
            } else {
              console.log('Call escalation initiated:', callResult);
              escalations.push({ type: 'call', message_id: message.id, status: 'initiated' });
            }
          } catch (error) {
            console.error('Error initiating call:', error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        escalations_triggered: escalations.length,
        escalations
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error checking escalations:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message || String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
