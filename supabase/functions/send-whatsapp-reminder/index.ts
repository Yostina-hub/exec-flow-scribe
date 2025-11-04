import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, type, message, meetingId, actionItemId } = await req.json();
    
    console.log(`Sending WhatsApp ${type} reminder to ${phoneNumber}`);

    // Get WhatsApp API configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: whatsappConfig } = await supabase
      .from('communication_settings')
      .select('config')
      .eq('channel', 'whatsapp')
      .single();

    if (!whatsappConfig?.config) {
      throw new Error('WhatsApp not configured');
    }

    const config = whatsappConfig.config;
    let messageText = message;

    // Build message based on type
    if (type === 'meeting' && meetingId) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select('title, start_time, location')
        .eq('id', meetingId)
        .single();

      if (meeting) {
        const startTime = new Date(meeting.start_time);
        messageText = `📅 Meeting Reminder\n\n*${meeting.title}*\n\n🕐 ${startTime.toLocaleString()}\n📍 ${meeting.location}\n\nJoin: [Meeting Link]`;
      }
    } else if (type === 'action_item' && actionItemId) {
      const { data: action } = await supabase
        .from('action_items')
        .select('title, due_date, priority')
        .eq('id', actionItemId)
        .single();

      if (action) {
        const dueDate = new Date(action.due_date);
        messageText = `✅ Task Deadline Reminder\n\n*${action.title}*\n\n⏰ Due: ${dueDate.toLocaleDateString()}\n🎯 Priority: ${action.priority}\n\nDon't forget to complete this task!`;
      }
    } else if (type === 'follow_up') {
      messageText = `🔔 Follow-up Reminder\n\n${message}\n\nPlease take action on the discussed items.`;
    } else if (type === 'daily_digest') {
      messageText = `☀️ Good Morning!\n\n${message}\n\nHave a productive day!`;
    }

    // Send via WhatsApp Business API
    const whatsappResponse = await fetch(`${config.api_endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'text',
        text: {
          preview_url: true,
          body: messageText
        }
      })
    });

    if (!whatsappResponse.ok) {
      const error = await whatsappResponse.text();
      console.error('WhatsApp API error:', error);
      throw new Error('Failed to send WhatsApp message');
    }

    const result = await whatsappResponse.json();
    console.log('WhatsApp message sent:', result);

    // Log the notification
    await supabase
      .from('message_logs')
      .insert({
        channel: 'whatsapp',
        recipient: phoneNumber,
        message: messageText,
        status: 'sent',
        meeting_id: meetingId,
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId: result.messages?.[0]?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-whatsapp-reminder:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
