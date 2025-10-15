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
    const { audioBase64, meetingId } = await req.json();

    if (!audioBase64 || !meetingId) {
      throw new Error("Audio data and meeting ID are required");
    }

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
    
    // Determine provider from preferences
    let provider: "openai" | "lovable" = "lovable";
    let openaiApiKey: string | null = null;
    if (userData?.user?.id) {
      const { data: prefs, error: prefsErr } = await supabase
        .from("transcription_preferences")
        .select("provider, openai_api_key")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!prefsErr && prefs) {
        if (prefs.provider === "openai" && prefs.openai_api_key) {
          provider = "openai";
          openaiApiKey = prefs.openai_api_key;
        }
      }
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    const audioBlob = new Blob([binaryAudio], { type: "audio/webm" });
    formData.append("file", audioBlob, "audio.webm");

    let transcriptText = "";

    if (provider === "openai" && openaiApiKey) {
      formData.append("model", "whisper-1");
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}` },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenAI transcription error:", errText);
        const isQuota = response.status === 402 || errText.includes("insufficient_quota");
        const isRateLimited = response.status === 429;
        console.log("OpenAI transcription failed. status:", response.status, "quota?", isQuota, "rateLimit?", isRateLimited);

        // Attempt Lovable AI fallback automatically
        const lovableFormData = new FormData();
        lovableFormData.append("file", audioBlob, "audio.webm");
        lovableFormData.append("model", "whisper-1");
        try {
          const fallbackResp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
            body: lovableFormData,
          });

          if (!fallbackResp.ok) {
            const fallbackErr = await fallbackResp.text();
            console.error("Lovable fallback transcription error:", fallbackErr);
            // Surface rate limit / credits errors explicitly
            if (fallbackResp.status === 429) {
              return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            if (fallbackResp.status === 402) {
              return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
                status: 402,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            throw new Error("Failed to transcribe audio with both OpenAI and Lovable AI");
          }

          const fallbackData = await fallbackResp.json();
          transcriptText = fallbackData.text;
        } catch (fbErr) {
          console.error("Fallback error:", fbErr);
          throw new Error("Failed to transcribe audio");
        }
      } else {
        const transcriptionData = await response.json();
        transcriptText = transcriptionData.text;
      }
    } else {
      // Primary: Lovable AI gateway
      formData.append("model", "whisper-1");
      const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: formData,
      });
      if (!response.ok) {
        const error = await response.text();
        console.error("Transcription error:", error);
        // Surface rate limit / credits errors explicitly
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Failed to transcribe audio");
      }
      const transcriptionData = await response.json();
      transcriptText = transcriptionData.text;
    }

    // Save transcription to database
    const { error: dbError } = await supabase.from("transcriptions").insert({
      meeting_id: meetingId,
      content: transcriptText,
      timestamp: new Date().toISOString(),
      confidence_score: 0.95,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save transcription");
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptText,
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
