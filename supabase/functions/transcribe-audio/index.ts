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
    
    // Determine provider
    const googleCloudApiKey = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    console.log('Available transcription providers:', {
      hasGoogleCloud: !!googleCloudApiKey,
      hasOpenAI: !!openaiApiKey
    });
    
    let transcriptText = "";
    let detectedLanguage: string | null = null;

    // Try Google Cloud Speech-to-Text first (better for Amharic)
    if (googleCloudApiKey) {
      console.log('Using Google Cloud Speech-to-Text API');
      
      try {
        // Convert audio to base64 for Google Cloud API
        const audioContent = btoa(String.fromCharCode(...binaryAudio));
        
        // Determine language code for Google Cloud
        let languageCode = "am-ET"; // Default to Amharic (Ethiopia)
        if (language === 'ar') {
          languageCode = "ar-SA"; // Arabic (Saudi Arabia)
        } else if (language && language !== 'auto' && language !== 'am') {
          languageCode = language;
        }
        
        console.log('Google Cloud language code:', languageCode);
        
        // Build Google Cloud request body dynamically
        const ct = (contentType && typeof contentType === 'string') ? contentType.toLowerCase() : 'audio/webm';
        const determineGcpEncoding = (ct: string) => {
          if (ct.includes('webm')) return 'WEBM_OPUS';
          if (ct.includes('ogg')) return 'OGG_OPUS';
          if (ct.includes('wav')) return 'LINEAR16';
          if (ct.includes('mp3')) return 'MP3';
          return 'ENCODING_UNSPECIFIED';
        };
        const encoding = determineGcpEncoding(ct);

        const gcpConfig: Record<string, any> = {
          languageCode,
          enableAutomaticPunctuation: true,
          encoding,
        };
        if (encoding === 'LINEAR16') {
          gcpConfig.sampleRateHertz = 24000;
        }
        if (language === 'auto') {
          gcpConfig.alternativeLanguageCodes = ['am-ET', 'ar-SA', 'en-US'];
        }
        if (languageCode === 'am-ET') {
          gcpConfig.speechContexts = [
            { phrases: ['እንዴት', 'ነው', 'እሺ', 'ስለዚህ', 'እባክህ', 'በጣም'], boost: 15.0 },
          ];
        }

        const requestBody = {
          config: gcpConfig,
          audio: { content: audioContent },
        };
        
        const response = await fetch(
          `https://speech.googleapis.com/v1/speech:recognize?key=${googleCloudApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error("Google Cloud API error:", response.status, errText);
          throw new Error(`Google Cloud API failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Google Cloud API response:', JSON.stringify(result).substring(0, 200));
        
        if (result.results && result.results.length > 0) {
          transcriptText = result.results
            .map((r: any) => r.alternatives[0]?.transcript || "")
            .join(" ")
            .trim();
          detectedLanguage = languageCode.split('-')[0]; // Extract language from code
          
          console.log('Google Cloud transcription successful:', {
            textLength: transcriptText.length,
            detectedLanguage,
            preview: transcriptText.substring(0, 100)
          });

          // Ensure Amharic output uses Ge'ez script; if not, retry with stronger bias
          const hasGeEz = /[\u1200-\u137F]/.test(transcriptText);
          const hasArabic = /[\u0600-\u06FF]/.test(transcriptText);
          const hasLatin = /[A-Za-z]/.test(transcriptText);
          console.log('GCP script detection:', { hasGeEz, hasArabic, hasLatin });

          if (languageCode === 'am-ET' && !hasGeEz) {
            console.log('Retrying GCP with stronger Amharic bias and no alternatives');
            const forcedBody: any = {
              config: {
                languageCode: 'am-ET',
                encoding: gcpConfig.encoding,
                enableAutomaticPunctuation: true,
                speechContexts: [
                  { phrases: ['እንዴት', 'ነው', 'እሺ', 'እባክህ', 'ስለዚህ', 'ዛሬ', 'ሰላም'], boost: 20.0 },
                ],
              },
              audio: { content: audioContent },
            };
            if (gcpConfig.encoding === 'LINEAR16') forcedBody.config.sampleRateHertz = 24000;

            const retryResp = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${googleCloudApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(forcedBody),
            });

            if (retryResp.ok) {
              const retryData = await retryResp.json();
              const retryText = (retryData.results || []).map((r: any) => r.alternatives?.[0]?.transcript || '').join(' ').trim();
              const retryHasGeEz = /[\u1200-\u137F]/.test(retryText);
              console.log('GCP retry result:', { retryHasGeEz, retryPreview: retryText.substring(0, 100) });
              if (retryHasGeEz && retryText) {
                transcriptText = retryText;
                detectedLanguage = 'am';
              }
            } else {
              console.warn('GCP retry failed:', await retryResp.text());
            }
          }
        } else {
          console.log('No transcription results from Google Cloud');
        }
      } catch (gcError) {
        console.error("Google Cloud transcription failed:", gcError);
        // Fall through to OpenAI fallback
      }
    }
    
    // Fallback to OpenAI if Google Cloud failed or not available
    if (!transcriptText && openaiApiKey) {
      console.log('Using OpenAI Whisper as fallback');
      
      const formData = new FormData();
      const type = contentType && typeof contentType === 'string' ? contentType : "audio/webm";
      const filename = type === 'audio/wav' ? 'audio.wav' : 'audio.webm';
      const audioBlob = new Blob([binaryAudio], { type });
      formData.append("file", audioBlob, filename);
      formData.append("model", "whisper-1");
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
      transcriptText = transcriptionData.text || transcriptionData.transcript || "";
      detectedLanguage = transcriptionData.language || null;
      
      console.log('OpenAI transcription result:', {
        detectedLanguage,
        textLength: transcriptText.length,
        firstChars: transcriptText.substring(0, 50)
      });
    }
    
    // If no transcription provider available
    if (!transcriptText && !googleCloudApiKey && !openaiApiKey) {
      throw new Error("No transcription provider configured. Please add GOOGLE_CLOUD_API_KEY or OPENAI_API_KEY.");
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
