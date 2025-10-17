import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Get language from request body
    const { language = 'en' } = await req.json().catch(() => ({ language: 'en' }));
    console.log('Creating OpenAI Realtime session for language:', language);

    // Create language-specific instructions
    const instructions = language === 'am'
      ? "You are a meeting transcription assistant for AMHARIC language. CRITICAL RULES FOR AMHARIC:\n1. ALWAYS write in Ge'ez script (ሀ ለ ሐ መ ሠ ረ ሰ ሸ ቀ በ ተ ቸ ኀ ነ ኘ አ ከ ኸ ወ ዐ ዘ ዠ የ ደ ጀ ገ ጠ ጨ ጰ ጸ ፀ ፈ ፐ)\n2. NEVER use Latin letters (a-z)\n3. NEVER transliterate or romanize\n4. Example correct: 'ሰላም ነው' NOT 'selam new'\n5. Identify speakers as ተናጋሪ 1, ተናጋሪ 2, etc.\n6. Maintain speaker consistency throughout.\n7. Include proper Amharic punctuation (።፣፤፥፦)."
      : language === 'ar'
      ? "You are a meeting transcription assistant for ARABIC language. CRITICAL: Always write in Arabic script (ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي). Never use Latin letters. Identify speakers as متحدث 1, متحدث 2, etc."
      : "You are a meeting transcription assistant. CRITICAL: Always transcribe speech in its ORIGINAL SCRIPT - never transliterate or romanize. For Amharic, use Ge'ez script (አማርኛ), not Latin letters. For Arabic, use Arabic script. For Chinese, use Chinese characters. Automatically detect language and identify different speakers as Speaker 1, Speaker 2, etc. Maintain speaker consistency throughout. Include proper punctuation.";

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        instructions
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Session created successfully");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
