import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EthioTelecomSMSRequest {
  recipient_phone: string;
  message: string;
  message_type?: 'reminder' | 'urgent' | 'notification';
  meeting_id?: string;
  user_id?: string;
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

    const { recipient_phone, message, message_type, meeting_id, user_id }: EthioTelecomSMSRequest = await req.json();

    console.log('Sending SMS via Ethiopian Telecom:', { recipient_phone, message_type });

    // Ethiopian Telecom SMS API integration
    const ethioTelecomApiUrl = 'https://api.ethiotelecom.et/sms/v1/send';
    const apiKey = Deno.env.get('ETHIO_TELECOM_API_KEY');
    const senderId = Deno.env.get('ETHIO_TELECOM_SENDER_ID') || 'EXEC_FLOW';

    if (!apiKey) {
      throw new Error('Ethiopian Telecom API key not configured');
    }

    // Format phone number for Ethiopian Telecom (remove + and ensure country code)
    const formattedPhone = recipient_phone.replace(/\+/g, '').startsWith('251') 
      ? recipient_phone.replace(/\+/g, '') 
      : `251${recipient_phone.replace(/^0+/, '')}`;

    // Send SMS via Ethiopian Telecom API
    const smsResponse = await fetch(ethioTelecomApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: formattedPhone,
        from: senderId,
        message: message,
        messageType: message_type || 'notification'
      })
    });

    const smsData = await smsResponse.json();
    const success = smsResponse.ok;

    // Log SMS in database
    const { data: messageLog, error: logError } = await supabaseClient
      .from('message_logs')
      .insert({
        user_id,
        meeting_id,
        channel: 'sms',
        message_type: message_type || 'notification',
        content: message,
        recipient_phone: formattedPhone,
        status: success ? 'sent' : 'failed',
        is_urgent: message_type === 'urgent',
        sent_at: new Date().toISOString(),
        metadata: smsData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging SMS:', logError);
    }

    console.log('SMS sent successfully:', { messageId: smsData.messageId, status: success ? 'sent' : 'failed' });

    return new Response(
      JSON.stringify({
        success,
        message_log_id: messageLog?.id,
        provider: 'ethio_telecom',
        message_id: smsData.messageId,
        status: success ? 'sent' : 'failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: success ? 200 : 500
      }
    );

  } catch (error: any) {
    console.error('Error sending SMS via Ethiopian Telecom:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
