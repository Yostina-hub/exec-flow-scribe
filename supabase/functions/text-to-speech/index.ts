import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice = 'onyx' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Map OpenAI voices to ElevenLabs voice IDs
    const voiceMap: Record<string, string> = {
      'alloy': '9BWtsMINqrJLrRacOk9x', // Aria
      'echo': 'pqHfZKP75CvOlQylNhV4', // Bill
      'fable': 'TX3LPaxmHKxFdv7VOQHJ', // Liam
      'onyx': 'N2lVS1w4EtoT3dr4eOWO', // Callum (deep voice)
      'nova': 'EXAVITQu4vr4xnSDxMaL', // Sarah
      'shimmer': 'pFZP5JQG7iQjIQuC4Bku', // Lily
    };

    const voiceId = voiceMap[voice] || 'N2lVS1w4EtoT3dr4eOWO'; // Default to Callum (professional voice)

    console.log(`Generating speech with ElevenLabs - Voice: ${voiceId}, Text length: ${text.length}`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5', // Fast, high-quality model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
        output_format: 'mp3_44100_128'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      const isQuota = errorText.includes('quota_exceeded');
      const isInvalid = errorText.includes('invalid_api_key');
      const status = isQuota ? 402 : isInvalid ? 401 : response.status;
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API error', details: errorText }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to binary string byte by byte to avoid stack overflow
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    
    const base64Audio = btoa(binary);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Text-to-speech generation failed' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
