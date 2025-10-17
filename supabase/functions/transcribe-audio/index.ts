import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

    try {
    const { audioBase64, meetingId, language, contentType } = await req.json();
    
    console.log('Transcription request received:', {
      hasAudio: !!audioBase64,
      meetingId,
      language: language || 'auto',
      contentType: contentType || 'audio/webm'
    });
    
    if (!audioBase64 || !meetingId) {
      throw new Error("Audio data and meeting ID are required");
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function stringToUUID(input: string) {
      const s = String(input);
      let h1 = 0xdeadbeef >>> 0, h2 = 0x41c6ce57 >>> 0;
      for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761) >>> 0;
        h2 = Math.imul(h2 ^ ch, 1597334677) >>> 0;
      }
      h1 = (h1 ^ (h1 >>> 16)) >>> 0;
      h2 = (h2 ^ (h2 >>> 13)) >>> 0;
      const bytes = new Uint8Array(16);
      const v = new DataView(bytes.buffer);
      v.setUint32(0, h1);
      v.setUint32(4, h2);
      v.setUint32(8, h1 ^ h2);
      v.setUint32(12, (h1 >>> 1) ^ (h2 << 1));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    const normalizedMeetingId = uuidRegex.test(String(meetingId)) ? String(meetingId) : stringToUUID(String(meetingId));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      },
    });

    // Get authed user (to read preferences)
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt || "");
    if (userErr || !userData?.user) {
      console.log("No user context for transcription; proceeding without preferences");
    }

    // Process audio in chunks to prevent memory issues
    function processBase64Chunks(base64String: string, chunkSize = 32768) {
      const chunks: Uint8Array[] = [];
      let position = 0;
      
      while (position < base64String.length) {
        const chunk = base64String.slice(position, position + chunkSize);
        const binaryChunk = atob(chunk);
        const bytes = new Uint8Array(binaryChunk.length);
        
        for (let i = 0; i < binaryChunk.length; i++) {
          bytes[i] = binaryChunk.charCodeAt(i);
        }
        
        chunks.push(bytes);
        position += chunkSize;
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    }

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audioBase64);
    
    // Determine provider and API key
    let openaiApiKey: string | null = null;
    const serverOpenAI = Deno.env.get("OPENAI_API_KEY") || null;

    // Default to server key
    openaiApiKey = serverOpenAI;

    // If user has a preference with their own key, prefer it
    if (userData?.user?.id) {
      const { data: prefs, error: prefsErr } = await supabase
        .from("transcription_preferences")
        .select("provider, openai_api_key")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!prefsErr && prefs) {
        if (prefs.provider === "openai" && prefs.openai_api_key) {
          openaiApiKey = prefs.openai_api_key;
        }
      }
    }

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the server");
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    const type = contentType && typeof contentType === 'string' ? contentType : "audio/webm";
    const filename = type === 'audio/wav' ? 'audio.wav' : 'audio.webm';
    const audioBlob = new Blob([binaryAudio], { type });
    formData.append("file", audioBlob, filename);

    let transcriptText = "";
    let detectedLanguage: string | null = null;

    if (openaiApiKey) {
      formData.append("model", "whisper-1");

      // Prefer verbose output to read detected language and enforce script rules
      formData.append("response_format", "verbose_json");
      
      // Special handling for Amharic
      if (language === 'am') {
        console.log('Amharic language specified - forcing Ge\'ez script');
        formData.append("language", "am");
        formData.append(
          "prompt",
          "አማርኛ በግእዝ ፊደላት ብቻ ተጻፍ። Transcribe strictly in Amharic using Ge'ez (Ethiopic) script only: አ ለ ሐ መ ሠ ረ ሰ ቀ በ ተ ቸ ነ ኘ እ ከ ወ ዐ ዘ የ ደ ገ ጠ ጰ ጸ ፀ ፈ ፐ። Never use Latin or Arabic characters for Amharic words."
        );
      } else if (language && language !== "auto") {
        formData.append("language", language);
        formData.append(
          "prompt",
          "Transcribe in the original script of the spoken language. For Amharic, use Ge'ez (Ethiopic) characters only."
        );
      } else {
        formData.append(
          "prompt",
          "Transcribe in the original script of the spoken language. For Amharic, use Ge'ez (Ethiopic) characters (አማርኛ) only. Never romanize or use Arabic script for Amharic."
        );
      }
      
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}` },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenAI transcription error:", errText);
        // Map common errors explicitly
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402 || errText.includes("insufficient_quota")) {
          return new Response(JSON.stringify({ error: "Payment required or quota exceeded for OpenAI API key." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Failed to transcribe audio with OpenAI");
      }

      const transcriptionData = await response.json();
      // Handle both simple text and verbose_json formats
      transcriptText = transcriptionData.text || transcriptionData.transcript || "";
      detectedLanguage = transcriptionData.language || null;
      
      console.log('Initial transcription result:', {
        detectedLanguage,
        textLength: transcriptText.length,
        firstChars: transcriptText.substring(0, 50)
      });
      
      const hasGeEz = /[\u1200-\u137F]/.test(transcriptText);
      const hasArabic = /[\u0600-\u06FF]/.test(transcriptText);
      const hasLatin = /[a-zA-Z]/.test(transcriptText);
      
      console.log('Script detection:', { hasGeEz, hasArabic, hasLatin });

      // If detected Amharic but script isn't Ge'ez, force a retry in Amharic
      if ((detectedLanguage === 'am' || language === 'am' || hasArabic) && !hasGeEz) {
        console.log('Amharic detected without Ge\'ez script - retrying with forced Amharic');
        const retryForm = new FormData();
        retryForm.append("file", audioBlob, filename);
        retryForm.append("model", "whisper-1");
        retryForm.append("language", "am");
        retryForm.append("response_format", "verbose_json");
        retryForm.append("prompt", "አማርኛ በግእዝ ፊደላት ብቻ ተጻፍ። Transcribe strictly in Amharic using Ge'ez (Ethiopic) script only: አ ለ ሐ መ ሠ ረ ሰ ቀ በ ተ ቸ ነ ኘ እ ከ ወ ዐ ዘ የ ደ ገ ጠ ጰ ጸ ፀ ፈ ፐ። Never use Latin or Arabic characters.");

        const retryResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiApiKey}` },
          body: retryForm,
        });

        if (retryResp.ok) {
          const retryData = await retryResp.json();
          const retryText = retryData.text || retryData.transcript || "";
          const retryHasGeEz = /[\u1200-\u137F]/.test(retryText);
          console.log('Retry result:', {
            retryTextLength: retryText.length,
            retryHasGeEz,
            firstChars: retryText.substring(0, 50)
          });
          if (retryHasGeEz && retryText) {
            transcriptText = retryText;
            detectedLanguage = 'am';
            console.log('✅ Successfully retried with Ge\'ez script');
          } else {
            console.log('⚠️ Retry still did not produce Ge\'ez script');
          }
        } else {
          const errorText = await retryResp.text();
          console.error("Amharic retry failed:", retryResp.status, errorText);
        }
      }
    }

    // Validate and save transcription
    if (!transcriptText || transcriptText.trim().length === 0) {
      console.warn("Empty transcription result - audio may be too long, silent, or corrupted");
      console.log(`Audio size: ${binaryAudio.length} bytes, estimated duration: ${(binaryAudio.length / (24000 * 2)).toFixed(2)}s`);
      return new Response(
        JSON.stringify({ 
          error: "Transcription produced no text. Audio may be too long (>30s), silent, or corrupted.",
          audioSize: binaryAudio.length,
          estimatedDuration: (binaryAudio.length / (24000 * 2)).toFixed(2)
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate basic confidence score based on audio quality
    const duration = binaryAudio.length / (24000 * 2); // 24kHz, 16-bit
    const confidenceScore = duration > 1 ? 0.95 : duration > 0.5 ? 0.85 : 0.75;

    // Save transcription to database with enhanced metadata
    const { error: dbError } = await supabase.from("transcriptions").insert({
      meeting_id: normalizedMeetingId,
      content: transcriptText.trim(),
      timestamp: new Date().toISOString(),
      confidence_score: confidenceScore,
      speaker_name: 'User',
      detected_language: detectedLanguage || 'auto'
    });

    if (dbError) {
      console.error("❌ Database error:", dbError);
      // Return success anyway since transcription succeeded
      return new Response(
        JSON.stringify({
          success: true,
          transcription: transcriptText.trim(),
          detectedLanguage: detectedLanguage,
          warning: "Transcription succeeded but saving to database failed"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Transcription saved successfully (${detectedLanguage})`);
    console.log('Final transcription preview:', transcriptText.substring(0, 100));
    
    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptText.trim(),
        detectedLanguage: detectedLanguage,
        confidenceScore: confidenceScore
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in transcribe-audio:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
