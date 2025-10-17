import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, voice = "alloy" } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!GEMINI_API_KEY || !ELEVENLABS_API_KEY) {
      throw new Error("API keys not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Invalid authorization");
    }

    let scriptPrompt = "";
    let entityId = meetingId;

    // Try to fetch as a notebook source first
    const { data: source } = await supabase
      .from("notebook_sources")
      .select("*")
      .eq("id", meetingId)
      .maybeSingle();

    if (source) {
      // This is a notebook source
      const contentPreview = source.content 
        ? source.content.substring(0, 2000) 
        : "No content available";

      scriptPrompt = `Create an engaging audio overview for this document. Make it sound like a professional podcast host presenting key insights from the document.

Document: ${source.title}
Type: ${source.source_type}
Content Preview: ${contentPreview}

Create a 2-3 minute script with:
- Brief introduction to the document
- Key highlights and main points
- Important takeaways
- Closing summary

Make it conversational and engaging. Format as natural narration.`;
    } else {
      // Try as a meeting
      const { data: meeting } = await supabase
        .from("meetings")
        .select("*, agenda_items(*)")
        .eq("id", meetingId)
        .maybeSingle();

      if (!meeting) {
        throw new Error("Meeting or source not found");
      }

      const { data: decisions } = await supabase
        .from("decisions")
        .select("*")
        .eq("meeting_id", meetingId);

      const { data: actions } = await supabase
        .from("action_items")
        .select("*")
        .eq("meeting_id", meetingId);

      scriptPrompt = `Create an engaging audio overview script for this executive meeting. Make it sound like a professional podcast discussion between two AI hosts discussing the meeting insights.

Meeting: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}

Key Decisions: ${decisions?.map(d => d.decision_text).join("; ") || "No decisions recorded"}
Action Items: ${actions?.map(a => a.title).join("; ") || "No action items recorded"}

Create a 2-3 minute conversational script with:
- Brief introduction
- Key highlights and decisions
- Important action items
- Closing summary

Format as natural dialogue.`;
    }

    const scriptResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: scriptPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
        }),
      }
    );

    const scriptData = await scriptResponse.json();
    const script = scriptData.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Unable to generate audio overview script.";

    // Generate audio with ElevenLabs
    const audioResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!audioResponse.ok) {
      const errText = await audioResponse.text();
      throw new Error(`Failed to generate audio: ${audioResponse.status} ${errText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = "";
    const chunkSize = 0x8000; // avoid call stack overflow
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binary);
    // Save to database
    await supabase.from("studio_outputs").insert({
      meeting_id: entityId,
      output_type: "audio_overview",
      content: { script, voice },
      generated_by: user.id,
    });

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        script
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating audio overview:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});