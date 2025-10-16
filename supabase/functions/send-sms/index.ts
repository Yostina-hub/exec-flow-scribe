import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  recipient_phone: string;
  message: string;
  user_id?: string;
  meeting_id?: string;
  message_type?: 'reminder' | 'urgent' | 'notification' | 'alert';
  is_urgent?: boolean;
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

    const { recipient_phone, message, user_id, meeting_id, message_type, is_urgent }: SMSRequest = await req.json();

    if (!recipient_phone || !message) {
      throw new Error('recipient_phone and message are required');
    }

    // Get SMS configuration
    const { data: smsConfig, error: configError } = await supabaseClient
      .from('communication_settings')
      .select('config')
      .eq('setting_type', 'sms')
      .eq('is_active', true)
      .single();

    if (configError || !smsConfig) {
      throw new Error('SMS configuration not found or inactive');
    }

    const config = smsConfig.config as any;
    let smsResponse;

    // Send SMS based on provider
    switch (config.provider) {
      case 'ethio_telecom':
        smsResponse = await sendEthioTelecomSMS(config, recipient_phone, message);
        break;
      
      case 'africa_talking':
        smsResponse = await sendAfricasTalkingSMS(config, recipient_phone, message);
        break;
      
      case 'twilio':
        smsResponse = await sendTwilioSMS(config, recipient_phone, message);
        break;
      
      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`);
    }

    // Log the message
    const { error: logError } = await supabaseClient
      .from('message_logs')
      .insert({
        user_id,
        meeting_id,
        channel: 'sms',
        message_type: message_type || 'notification',
        content: message,
        recipient_phone,
        status: smsResponse.success ? 'sent' : 'failed',
        is_urgent: is_urgent || false,
        sent_at: new Date().toISOString(),
        metadata: smsResponse.metadata || {}
      });

    if (logError) {
      console.error('Failed to log message:', logError);
    }

    return new Response(
      JSON.stringify({
        success: smsResponse.success,
        message_id: smsResponse.message_id,
        status: smsResponse.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: smsResponse.success ? 200 : 500
      }
    );

  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function sendEthioTelecomSMS(config: any, phone: string, message: string) {
  // Ethio Telecom SMS API integration
  // Note: Update with actual Ethio Telecom API endpoint and authentication
  try {
    const response = await fetch(config.api_endpoint || 'https://sms.ethiotelecom.et/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        sender: config.sender_id,
        recipient: phone,
        message: message
      })
    });

    const data = await response.json();
    
    return {
      success: response.ok,
      message_id: data.message_id || data.id,
      status: data.status,
      metadata: data
    };
  } catch (error) {
    console.error('Ethio Telecom SMS error:', error);
    return {
      success: false,
      message_id: null,
      status: 'failed',
      metadata: { error: String(error) }
    };
  }
}

async function sendAfricasTalkingSMS(config: any, phone: string, message: string) {
  // Africa's Talking SMS API - Direct HTTP implementation
  try {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': config.api_key,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        username: config.username || 'sandbox',
        to: phone,
        message: message,
        from: config.sender_id || ''
      }).toString()
    });

    const data = await response.json();

    return {
      success: data.SMSMessageData?.Recipients?.[0]?.status === 'Success',
      message_id: data.SMSMessageData?.Recipients?.[0]?.messageId,
      status: data.SMSMessageData?.Recipients?.[0]?.status || 'failed',
      metadata: data
    };
  } catch (error) {
    console.error('Africa\'s Talking SMS error:', error);
    const err = error as Error;
    return {
      success: false,
      message_id: null,
      status: 'failed',
      metadata: { error: err.message || String(error) }
    };
  }
}

async function sendTwilioSMS(config: any, phone: string, message: string) {
  // Twilio SMS API
  const accountSid = config.account_sid || config.api_key.split(':')[0];
  const authToken = config.auth_token || config.api_key.split(':')[1];

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: phone,
          From: config.sender_id,
          Body: message
        }).toString()
      }
    );

    const data = await response.json();
    
    return {
      success: response.ok,
      message_id: data.sid,
      status: data.status,
      metadata: data
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    const err = error as Error;
    return {
      success: false,
      message_id: null,
      status: 'failed',
      metadata: { error: err.message || String(error) }
    };
  }
}