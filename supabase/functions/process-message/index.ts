import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageRequest {
  recipient_phone: string;
  message: string;
  user_id?: string;
  meeting_id?: string;
  message_type?: 'reminder' | 'urgent' | 'notification' | 'alert';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { recipient_phone, message, user_id, meeting_id, message_type }: MessageRequest = await req.json();

    // Detect urgent keywords
    const { data: keywords } = await supabaseClient
      .from('urgent_keywords')
      .select('*')
      .eq('is_active', true);

    const detectedKeywords: string[] = [];
    let highestPriority = 0;
    let isUrgent = false;

    if (keywords) {
      const messageLower = message.toLowerCase();
      for (const keyword of keywords) {
        if (messageLower.includes(keyword.keyword.toLowerCase())) {
          detectedKeywords.push(keyword.keyword);
          if (keyword.priority_level > highestPriority) {
            highestPriority = keyword.priority_level;
          }
          if (keyword.auto_escalate) {
            isUrgent = true;
          }
        }
      }
    }

    // Create message log
    const { data: messageLog, error: logError } = await supabaseClient
      .from('message_logs')
      .insert({
        user_id,
        meeting_id,
        channel: 'whatsapp',
        message_type: message_type || (isUrgent ? 'urgent' : 'notification'),
        content: message,
        recipient_phone,
        status: 'pending',
        is_urgent: isUrgent,
        urgency_keywords: detectedKeywords,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }

    // Send via WhatsApp first
    const whatsappResult = await sendWhatsAppMessage(supabaseClient, recipient_phone, message);

    // Update message log with send status
    await supabaseClient
      .from('message_logs')
      .update({
        status: whatsappResult.success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        metadata: whatsappResult.metadata
      })
      .eq('id', messageLog.id);

    // If urgent and WhatsApp failed, immediately escalate to SMS
    if (isUrgent && !whatsappResult.success) {
      console.log('Urgent message failed on WhatsApp, escalating to SMS');
      await escalateToSMS(supabaseClient, messageLog.id, recipient_phone, message, user_id, meeting_id);
    }

    // Set up escalation monitoring if urgent
    if (isUrgent && whatsappResult.success) {
      await scheduleEscalationCheck(supabaseClient, messageLog.id, highestPriority);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_log_id: messageLog.id,
        is_urgent: isUrgent,
        detected_keywords: detectedKeywords,
        priority_level: highestPriority,
        whatsapp_status: whatsappResult.success ? 'sent' : 'failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error processing message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function sendWhatsAppMessage(supabaseClient: any, phone: string, message: string) {
  try {
    const { data: whatsappConfig } = await supabaseClient
      .from('communication_settings')
      .select('config')
      .eq('setting_type', 'whatsapp')
      .eq('is_active', true)
      .single();

    if (!whatsappConfig) {
      return { success: false, metadata: { error: 'WhatsApp not configured' } };
    }

    const config = whatsappConfig.config as any;

    // WhatsApp Business API call
    const response = await fetch(`${config.api_endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''),
        type: 'text',
        text: { body: message }
      })
    });

    const data = await response.json();

    return {
      success: response.ok,
      metadata: data
    };

  } catch (error) {
    console.error('WhatsApp send error:', error);
    const err = error as Error;
    return { success: false, metadata: { error: err.message || String(error) } };
  }
}

async function escalateToSMS(supabaseClient: any, messageLogId: string, phone: string, message: string, userId?: string, meetingId?: string) {
  try {
    // Call SMS edge function
    const { data, error } = await supabaseClient.functions.invoke('send-sms', {
      body: {
        recipient_phone: phone,
        message: message,
        user_id: userId,
        meeting_id: meetingId,
        message_type: 'urgent',
        is_urgent: true
      }
    });

    // Update escalation status
    await supabaseClient
      .from('message_logs')
      .update({
        escalation_level: 1,
        escalated_at: new Date().toISOString(),
        metadata: { sms_sent: !!data && !error }
      })
      .eq('id', messageLogId);

    return { success: !error };
  } catch (error) {
    console.error('SMS escalation error:', error);
    return { success: false };
  }
}

async function scheduleEscalationCheck(supabaseClient: any, messageLogId: string, priorityLevel: number) {
  // Get escalation rule based on priority
  const { data: rule } = await supabaseClient
    .from('escalation_rules')
    .select('*')
    .eq('priority_level', priorityLevel)
    .eq('is_active', true)
    .single();

  if (!rule) {
    console.log('No escalation rule found for priority', priorityLevel);
    return;
  }

  // In production, use a job queue or cron to check message status after wait_time_minutes
  // For now, log the scheduled escalation
  console.log(`Escalation scheduled for message ${messageLogId} in ${rule.wait_time_minutes} minutes to ${rule.escalate_to}`);
  
  // Store escalation schedule in metadata
  await supabaseClient
    .from('message_logs')
    .update({
      metadata: {
        escalation_scheduled: true,
        escalation_time: new Date(Date.now() + rule.wait_time_minutes * 60000).toISOString(),
        escalate_to: rule.escalate_to
      }
    })
    .eq('id', messageLogId);
}