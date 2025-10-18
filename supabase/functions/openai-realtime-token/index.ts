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
    const { language = 'auto' } = await req.json().catch(() => ({ language: 'auto' }));
    console.log('Creating OpenAI Realtime session for language:', language);

    // Create language-specific instructions with explicit Amharic guidance
    const instructions = language === 'am'
      ? "CRITICAL: This is AMHARIC (አማርኛ) language, NOT ARABIC. You must transcribe using Ge'ez/Ethiopic script (ሀ ለ ሐ መ ሠ ረ ሰ ሸ). NEVER use Arabic script (ا ب ت). Examples of Amharic: ሰላም, እንዴት ነህ, ጥሩ ነው. Use punctuation: ። Identify speakers as ተናጋሪ 1, ተናጋሪ 2."
      : language === 'ar'
      ? "You are a meeting transcription assistant for ARABIC. Always write in Arabic script. No romanization."
      : "Auto-detect language. IMPORTANT: Distinguish Amharic (Ge'ez/Ethiopic script: ሀ ለ ሐ መ) from Arabic (Arabic script: ا ب ت). Use original scripts; for Amharic use Ge'ez, NOT Arabic. Support code-switching. Identify speakers (Speaker 1, Speaker 2). Only transcribe.";

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        modalities: ["text"],
        instructions,
        // Build transcription config dynamically to avoid invalid null fields
        input_audio_transcription: (() => {
          const tx: Record<string, any> = { model: "whisper-1" };
          if (language && language !== 'auto' && language !== 'am') {
            tx.language = language;
          }
          if (language === 'am') {
            tx.prompt = "አማርኛ ጌዝ ስክሪፕት። ሰላም እንዴት ነህ እንደምን ዋላችሁ ጤና ይስጥልኝ አመሰግናለሁ በጣም ደስ ይላል መልካም ቀን ደህና ይሁኑ እናመሰግናለን ቡና ውሃ እንጀራ ጫት እንኳን ደህና መጣችሁ እንኳን አደረሳችሁ ምን አለ ምንድነው እሺ እርግጠኛ ነኝ እንገናኝ። አማርኛ ብቻ NOT Arabic script ا ب ت ث";
          }
          return tx;
        })(),
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: false
        }
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
