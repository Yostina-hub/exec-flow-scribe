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

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, agenda_items(*)")
      .eq("id", meetingId)
      .eq("meeting_type", "virtual_room")
      .single();

    if (meetingError || !meeting) {
      return new Response(
        JSON.stringify({ error: "Virtual room meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const prompt = `Generate comprehensive, professional meeting minutes for a virtual room meeting with exceptional writing quality.

✍️ GRAMMAR & WRITING EXCELLENCE (CRITICAL):
• Perfect grammar - zero errors, proper subject-verb agreement, consistent tenses
• Professional, polished language - executive-level sophistication
• Complete sentences with proper punctuation throughout
• Precise, professional vocabulary
• Active voice preference for clarity
• Consistent past tense for completed discussions
• Clear pronouns with explicit antecedents
• Proofread mentally before output - this is professional documentation

📝 ENHANCED DESCRIPTIVE STANDARDS:
• Use rich, descriptive language that provides vivid understanding
• Explain WHY decisions were made with full contextual background, not just WHAT
• Detail reasoning, rationale, evidence, and thought processes behind discussions
• Describe conversation dynamics (collaborative, analytical, constructive, strategic)
• Elaborate on HOW ideas evolved and were refined during deliberations
• Use professional transitions to show logical relationships between topics
• Provide comprehensive background when speakers reference prior context
• Add analytical depth - explain implications, significance, potential impacts
• Include contextual details and stakeholder perspectives
• Use descriptive adjectives and adverbs to enrich the narrative
• Expand on key points - explain importance and connections, not just list items

✅ PUNCTUATION EXCELLENCE:
• Use proper punctuation consistently and flawlessly
• End every sentence with appropriate punctuation (. ! ?)
• Use commas correctly for clauses, series, improved readability
• Use colons (:) to introduce lists or elaborations
• Use semicolons (;) for related independent clauses
• Use quotation marks for direct quotes
• Format lists with proper bullets or numbering
• Create clear paragraph breaks between topics

🎯 MEETING CONTEXT:
Title: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Meeting Type: Virtual Room (3D Immersive Experience)

📝 PLANNED AGENDA:
${agendaList}

🗣️ COMPLETE TRANSCRIPT:
${fullTranscript || 'No transcript available - generate comprehensive draft based on agenda and decisions'}

✅ RECORDED DECISIONS:
${decisionsList}

📊 REQUIRED SECTIONS (comprehensive and well-written):
1. **Executive Summary** - 4-6 sophisticated, information-rich sentences capturing complete meeting overview. Use varied structures, professional transitions, perfect grammar. This must be exceptionally well-written.
2. **Key Discussion Points** - Detailed, descriptive coverage of ALL topics discussed. Include who introduced topics, context provided, different perspectives, questions and answers, reasoning shared. Use narrative prose, not bullet points.
3. **Decisions Made** - ALL decisions with comprehensive context about how they were reached, rationale, implications, and stakeholder input.
4. **Action Items** - ALL actions with full details: who, what, when, why, expected outcomes, success criteria.
5. **Next Steps** - Future plans and follow-ups discussed with comprehensive context and timeline.

Format as professional markdown with clear headers (##), well-structured paragraphs, proper punctuation, and sophisticated narrative prose that flows smoothly.`;

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
            content: "You are a professional meeting minutes generator specializing in virtual room meetings. Generate grammatically perfect, professionally polished minutes with rich descriptive detail, proper punctuation, and executive-level writing quality. Focus on accuracy and only include information explicitly stated in the transcript. Use sophisticated vocabulary, varied sentence structures, and comprehensive explanations."
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
