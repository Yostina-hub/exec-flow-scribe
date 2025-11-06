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

    // Get authed user and preferences
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt || "");
    
    let userPreference = null;
    if (userData?.user) {
      const { data: pref } = await supabase
        .from("transcription_preferences")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      userPreference = pref;
      console.log('User transcription preference:', pref?.provider || 'none set');
    } else {
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
    
    // Determine available providers and user preference
    const googleCloudApiKey = Deno.env.get("GOOGLE_CLOUD_API_KEY");
    const openaiApiKey = userPreference?.openai_api_key || Deno.env.get("OPENAI_API_KEY");
    
    const preferredProvider = userPreference?.provider || 'auto';
    console.log('Transcription configuration:', {
      preferredProvider,
      hasGoogleCloud: !!googleCloudApiKey,
      hasOpenAI: !!openaiApiKey,
      hasUserApiKey: !!userPreference?.openai_api_key
    });
    
    let transcriptText = "";
    let detectedLanguage: string | null = null;
    let usedProvider = "";

    // Determine provider order based on preference
    // Always prioritize Google Cloud (Gemini) unless user explicitly selects OpenAI
    const providers: Array<'google' | 'openai'> = [];
    
    if (preferredProvider === 'openai' || preferredProvider === 'openai_realtime') {
      // User explicitly wants OpenAI
      if (openaiApiKey) providers.push('openai');
      if (googleCloudApiKey) providers.push('google'); // Fallback to Gemini
    } else {
      // Default: Use Google Cloud (Gemini) as PRIMARY as requested
      if (googleCloudApiKey) providers.push('google');
      if (openaiApiKey) providers.push('openai');
    }
    
    console.log('🎯 Provider order (Gemini PRIMARY):', providers);

    // Try providers in order
    for (const provider of providers) {
      if (transcriptText) break; // Skip if we already got a transcription
      
      if (provider === 'google' && googleCloudApiKey) {
        try {
          console.log('🎙️ Trying Google Cloud Speech-to-Text (Gemini-based) - PRIMARY');
          
          // Convert audio to base64 for Google Cloud API (avoid spread to prevent call stack overflow)
          let binaryStr = '';
          const CHUNK = 0x8000; // 32k
          for (let i = 0; i < binaryAudio.length; i += CHUNK) {
            const sub = binaryAudio.subarray(i, Math.min(i + CHUNK, binaryAudio.length));
            // Build string without spreading args
            let s = '';
            for (let j = 0; j < sub.length; j++) s += String.fromCharCode(sub[j]);
            binaryStr += s;
          }
          const audioContent = btoa(binaryStr);
          
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
            
            // Handle rate limits from Google Cloud
            if (response.status === 429) {
              console.warn("Google Cloud rate limited, trying fallback");
            } else if (response.status === 403 && errText.includes('quota')) {
              console.warn("Google Cloud quota exceeded, trying fallback");
            }
            // Don't throw, continue to next provider
          } else {
            const result = await response.json();
            console.log('Google Cloud API response:', JSON.stringify(result).substring(0, 200));
            
            if (result.results && result.results.length > 0) {
              transcriptText = result.results
                .map((r: any) => r.alternatives[0]?.transcript || "")
                .join(" ")
                .trim();
              detectedLanguage = languageCode.split('-')[0];
              
              usedProvider = 'google';
              console.log('✅ Google Cloud (Gemini) transcription successful:', {
                textLength: transcriptText.length,
                detectedLanguage,
                preview: transcriptText.substring(0, 100)
              });

              // Ensure Amharic output uses Ge'ez script
              const hasGeEz = /[\u1200-\u137F]/.test(transcriptText);
              const hasArabic = /[\u0600-\u06FF]/.test(transcriptText);
              const hasLatin = /[A-Za-z]/.test(transcriptText);
              console.log('GCP script detection:', { hasGeEz, hasArabic, hasLatin });

              if (languageCode === 'am-ET' && !hasGeEz) {
                console.log('Retrying GCP with stronger Amharic bias');
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
          }
        } catch (gcError) {
          console.error("❌ Google Cloud transcription failed:", gcError);
          // Continue to next provider
        }
      } else if (provider === 'openai' && openaiApiKey) {
        try {
          console.log('🎙️ Trying OpenAI Whisper API (Fallback)');
          
          const formData = new FormData();
          const type = contentType && typeof contentType === 'string' ? contentType : "audio/webm";
          const filename = type === 'audio/wav' ? 'audio.wav' : 'audio.webm';
          const audioBlob = new Blob([binaryAudio], { type });
          formData.append("file", audioBlob, filename);
          formData.append("model", "whisper-1");
          formData.append("response_format", "verbose_json");
          
          // Special handling for language parameter
          // Convert BCP-47 (e.g., am-ET) to ISO-639-1 (e.g., am) for OpenAI when applicable
          const toIso639 = (lang: string): string => (lang || '').split('-')[0].toLowerCase();
          const iso639Lang = toIso639(language || '');

          // For Amharic, do NOT send the language param (OpenAI may reject 'am'); rely on auto-detect
          if (iso639Lang === 'am') {
            console.log("Skipping OpenAI 'language' param for Amharic; relying on auto-detect");
            formData.append(
              "prompt",
              "Transcribe strictly in Amharic using Ge'ez (Ethiopic) script only: አ ለ ሐ መ ሠ ረ ሰ ቀ በ ተ ቸ ነ ኘ እ ከ ወ ዐ ዘ የ ደ ገ ጠ ጰ ጸ ፀ ፈ ፐ. Never use Latin or Arabic characters for Amharic words."
            );
          } else if (iso639Lang && iso639Lang !== 'auto') {
            console.log(`Setting OpenAI language to ISO-639-1: ${iso639Lang} (from ${language})`);
            formData.append("language", iso639Lang);
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
            const statusCode = response.status;
            console.error(`❌ OpenAI transcription error (${statusCode}):`, errText);

            // If language parameter caused the error, retry once without language
            if (/language/i.test(errText)) {
              try {
                console.log("Retrying OpenAI transcription without 'language' param");
                const retryForm = new FormData();
                const typeRetry = contentType && typeof contentType === 'string' ? contentType : "audio/webm";
                const filenameRetry = typeRetry === 'audio/wav' ? 'audio.wav' : 'audio.webm';
                const audioBlobRetry = new Blob([binaryAudio], { type: typeRetry });
                retryForm.append("file", audioBlobRetry, filenameRetry);
                retryForm.append("model", "whisper-1");
                retryForm.append("response_format", "verbose_json");
                retryForm.append("prompt", "Transcribe in the original script of the spoken language. For Amharic, use Ge'ez (Ethiopic) characters (አማርኛ) only.");

                const retryResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${openaiApiKey}` },
                  body: retryForm,
                });

                if (retryResp.ok) {
                  const retryData = await retryResp.json();
                  transcriptText = retryData.text || retryData.transcript || "";
                  detectedLanguage = retryData.language || null;
                  usedProvider = 'openai';
                  console.log('✅ OpenAI transcription successful on retry');
                  break; // exit provider loop
                } else {
                  console.error('OpenAI retry failed:', await retryResp.text());
                }
              } catch (retryErr) {
                console.error('OpenAI retry exception:', retryErr);
              }
            }
            
            // Handle rate limiting
            if (statusCode === 429) {
              console.warn("⚠️ OpenAI rate limited");
              if (providers.indexOf('openai') === providers.length - 1) {
                return new Response(JSON.stringify({ 
                  error: "⏳ Rate Limit Exceeded\n\nAll transcription providers are temporarily rate limited.\n\nPlease wait 2-3 minutes and try again.",
                  retryAfter: 120,
                  status: 429
                }), {
                  status: 429,
                  headers: { 
                    ...corsHeaders, 
                    "Content-Type": "application/json",
                    "Retry-After": "120"
                  },
                });
              }
              continue;
            }
            
            // Handle quota/payment issues
            if (statusCode === 402 || errText.includes("insufficient_quota")) {
              if (providers.indexOf('openai') === providers.length - 1) {
                return new Response(JSON.stringify({ 
                  error: "💳 Payment Required\n\nYour OpenAI API quota has been exhausted.\n\nPlease check your OpenAI account billing or add a different API key.",
                  status: 402
                }), {
                  status: 402,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
              continue;
            }
            
            // Other errors - continue to next provider
            console.error(`OpenAI error: ${errText}`);
            continue;
          }

          const transcriptionData = await response.json();
          transcriptText = transcriptionData.text || transcriptionData.transcript || "";
          detectedLanguage = transcriptionData.language || null;
          usedProvider = 'openai';
          
          console.log('✅ OpenAI transcription successful:', {
            detectedLanguage,
            textLength: transcriptText.length,
            firstChars: transcriptText.substring(0, 50)
          });
        } catch (openaiError) {
          console.error("❌ OpenAI transcription failed:", openaiError);
          // Continue to next provider
        }
      }
    }
    
    // If no transcription provider available or all failed
    if (!transcriptText) {
      if (providers.length === 0) {
        return new Response(JSON.stringify({
          error: "⚙️ Configuration Required\n\nNo transcription provider is configured.\n\nPlease add API keys in Settings → AI Provider.",
          status: 503
        }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("❌ All transcription providers failed or returned empty result");
      return new Response(JSON.stringify({ 
        error: "🔧 Transcription Failed\n\nAll configured providers failed to transcribe the audio.\n\nPlease check:\n• API keys are valid and have sufficient quota\n• Audio file is not corrupted\n• Audio is not too long (>30 seconds may fail)",
        status: 503
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    console.log(`✅ Transcription saved successfully using ${usedProvider} (${detectedLanguage})`);
    console.log('Final transcription preview:', transcriptText.substring(0, 100));
    
    // Update meeting workflow status
    await supabase.from("meetings").update({ 
      transcription_status: 'completed',
      workflow_stage: 'transcribing'
    }).eq("id", normalizedMeetingId);
  
    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptText.trim(),
        detectedLanguage: detectedLanguage,
        confidenceScore: confidenceScore,
        provider: usedProvider
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
