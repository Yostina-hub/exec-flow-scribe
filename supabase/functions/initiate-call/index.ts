import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallRequest {
  recipient_phone: string;
  message: string;
  user_id?: string;
  meeting_id?: string;
  call_type?: 'reminder' | 'urgent' | 'escalation';
  message_log_id?: string;
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

    const { recipient_phone, message, user_id, meeting_id, call_type, message_log_id }: CallRequest = await req.json();

    if (!recipient_phone || !message) {
      throw new Error('recipient_phone and message are required');
    }

    // Get FreePBX configuration
    const { data: pbxConfig, error: configError } = await supabaseClient
      .from('communication_settings')
      .select('config')
      .eq('setting_type', 'freepbx')
      .eq('is_active', true)
      .single();

    if (configError || !pbxConfig) {
      throw new Error('FreePBX configuration not found or inactive');
    }

    const config = pbxConfig.config as any;

    // Initiate call via FreePBX
    const callResult = await initiateFreePBXCall(config, recipient_phone, message);

    // Log the call
    const { data: callLog, error: logError } = await supabaseClient
      .from('call_logs')
      .insert({
        user_id,
        message_log_id,
        phone_number: recipient_phone,
        call_type: call_type || 'escalation',
        call_status: callResult.success ? 'initiated' : 'failed',
        call_sid: callResult.call_sid,
        started_at: new Date().toISOString(),
        metadata: callResult.metadata || {}
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log call:', logError);
    }

    // Update message log if provided
    if (message_log_id) {
      await supabaseClient
        .from('message_logs')
        .update({
          escalation_level: 3,
          escalated_at: new Date().toISOString(),
          metadata: { call_log_id: callLog?.id }
        })
        .eq('id', message_log_id);
    }

    return new Response(
      JSON.stringify({
        success: callResult.success,
        call_id: callLog?.id,
        call_sid: callResult.call_sid,
        status: callResult.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: callResult.success ? 200 : 500
      }
    );

  } catch (error: any) {
    console.error('Error initiating call:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function initiateFreePBXCall(config: any, phone: string, message: string) {
  // FreePBX ARI (Asterisk REST Interface) integration
  try {
    const ariEndpoint = `${config.server_url}/ari/channels`;
    
    // Create TTS audio file for the message
    const ttsUrl = await generateTTSForMessage(message);

    // Initiate outbound call via FreePBX ARI
    const response = await fetch(`${ariEndpoint}?endpoint=PJSIP/${phone}&app=meetinghub`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${config.extension}:${config.api_key}`)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: `PJSIP/${phone}`,
        callerId: config.caller_id,
        timeout: 30,
        variables: {
          CALLERID_NUM: config.caller_id,
          AUDIO_MESSAGE_URL: ttsUrl
        }
      })
    });

    if (!response.ok) {
      throw new Error(`FreePBX API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Play the message when call is answered
    if (data.id) {
      await playMessageOnAnswer(config, data.id, ttsUrl);
    }

    return {
      success: true,
      call_sid: data.id,
      status: 'initiated',
      metadata: data
    };

  } catch (error) {
    console.error('FreePBX call error:', error);
    const err = error as Error;
    return {
      success: false,
      call_sid: null,
      status: 'failed',
      metadata: { error: err.message || String(error) }
    };
  }
}

async function generateTTSForMessage(message: string): Promise<string> {
  // Generate TTS audio using OpenAI or similar service
  // For now, return a placeholder URL
  // In production, integrate with TTS service
  
  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: message,
        voice: 'nova',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error('TTS generation failed');
    }

    const audioBuffer = await response.arrayBuffer();
    // In production, upload to storage and return URL
    // For now, return base64 data URL
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    return `data:audio/mp3;base64,${base64Audio}`;

  } catch (error) {
    console.error('TTS generation error:', error);
    return '';
  }
}

async function playMessageOnAnswer(config: any, channelId: string, audioUrl: string) {
  // Wait for channel to be answered, then play message
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for answer

    const response = await fetch(`${config.server_url}/ari/channels/${channelId}/play`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${config.extension}:${config.api_key}`)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        media: audioUrl
      })
    });

    if (!response.ok) {
      console.error('Failed to play message on call');
    }
  } catch (error) {
    console.error('Error playing message:', error);
  }
}