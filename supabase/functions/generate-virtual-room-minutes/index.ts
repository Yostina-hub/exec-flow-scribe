import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { meetingId } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: "Meeting ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🌐 Generating minutes for virtual room meeting:", meetingId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch meeting details (works for all meeting types)
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, agenda_items(*)")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      console.error("Meeting fetch error:", meetingError);
      return new Response(
        JSON.stringify({ 
          error: "Meeting not found",
          details: meetingError?.message || "Meeting does not exist"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Meeting found:", meeting.title, "Type:", meeting.meeting_type);

    // Fetch virtual room specific transcriptions
    console.log("📝 Fetching virtual room transcriptions...");
    const { data: transcriptions, error: transcriptionError } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });

    if (transcriptionError) {
      console.error("Transcription error:", transcriptionError);
    }

    const fullTranscript = transcriptions
      ?.map((t) => `${t.speaker_name || "Participant"}: ${t.content}`)
      .join("\n\n") || "";

    // Fetch decisions
    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meetingId);

    const agendaList = meeting.agenda_items
      ?.map((item: any) => `- ${item.title}`)
      .join("\n") || "No agenda items";

    const decisionsList = decisions
      ?.map((d: any) => `- ${d.decision_text}`)
      .join("\n") || "No decisions recorded";

    const prompt = `Generate comprehensive meeting minutes for a virtual room meeting.

🎯 MEETING CONTEXT:
Title: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Meeting Type: Virtual Room (3D Immersive)

📝 AGENDA:
${agendaList}

🗣️ TRANSCRIPT:
${fullTranscript || 'No transcript available - generate draft based on agenda'}

✅ DECISIONS:
${decisionsList}

📊 REQUIRED SECTIONS:
1. Executive Summary (2-3 sentences)
2. Key Discussion Points
3. Decisions Made
4. Action Items
5. Next Steps

Format as professional markdown. Be concise and accurate.`;

    // Use Lovable AI for generation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🤖 Generating with Lovable AI (Gemini 2.5 Flash)...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a professional meeting minutes generator specializing in virtual room meetings. Focus on accuracy and only include information explicitly stated in the transcript." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error(`AI error (${status}):`, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "⏳ Rate limit reached. Please wait 2-3 minutes and try again.",
            status: 429
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "💳 AI credits required. Please add credits in Settings.",
            status: 402
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI service error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const minutes = aiData.choices?.[0]?.message?.content || "";

    if (!minutes) {
      throw new Error("Failed to generate minutes");
    }

    // Save minutes to database
    const { error: insertError } = await supabase
      .from("meeting_minutes")
      .insert({
        meeting_id: meetingId,
        content: minutes,
        generated_by: user.id,
        version: 1,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save minutes");
    }

    // Update meeting status
    await supabase
      .from("meetings")
      .update({ 
        minutes_status: "generated",
        workflow_stage: "minutes_ready"
      })
      .eq("id", meetingId);

    console.log("✅ Virtual room minutes generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        minutes,
        message: "Minutes generated successfully for virtual room"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
