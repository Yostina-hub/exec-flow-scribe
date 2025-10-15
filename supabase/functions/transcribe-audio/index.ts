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
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    // Create FormData for file upload
    const formData = new FormData();
    const audioBlob = new Blob([binaryAudio], { type: "audio/webm" });
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");

    // Call Lovable AI for transcription
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Transcription error:", error);
      throw new Error("Failed to transcribe audio");
    }

    const transcriptionData = await response.json();
    const transcriptText = transcriptionData.text;

    // Save transcription to database
    const { error: dbError } = await supabase.from("transcriptions").insert({
      meeting_id: meetingId,
      content: transcriptText,
      timestamp: new Date().toISOString(),
      confidence_score: transcriptionData.confidence || 0.95,
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
