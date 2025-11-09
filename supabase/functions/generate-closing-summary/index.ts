import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, meeting_attendees(count)")
      .eq("id", meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Get all transcriptions
    const { data: transcriptions } = await supabase
      .from("transcriptions")
      .select("content, speaker, timestamp")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });

    // Get decisions
    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meetingId);

    // Get action items
    const { data: actions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meetingId);

    // Get speaker analytics
    const { data: speakerAnalytics } = await supabase
      .from("speaker_analytics")
      .select("*")
      .eq("meeting_id", meetingId);

    // Build context
    const context = {
      meetingDuration: meeting.duration || "unknown",
      transcriptCount: transcriptions?.length || 0,
      decisionsCount: decisions?.length || 0,
      actionsCount: actions?.length || 0,
      completedActions: actions?.filter((a) => a.status === "completed").length || 0,
      participantCount: meeting.meeting_attendees?.[0]?.count || 0,
      transcript: transcriptions?.map((t) => `${t.speaker}: ${t.content}`).join("\n").slice(0, 5000),
    };

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a meeting analytics expert. Generate a comprehensive closing summary with these fields:
{
  "overallStatus": "completed" | "in-progress" | "pending",
  "tempo": "on-track" | "fast" | "slow",
  "completionRate": <number 0-100>,
  "keyAchievements": [<strings>],
  "openItems": [<strings>],
  "nextSteps": [<strings>],
  "meetingEffectiveness": <number 0-100>,
  "participationScore": <number 0-100>,
  "recommendations": [<strings>]
}
Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Meeting context:
Duration: ${context.meetingDuration}
Participants: ${context.participantCount}
Decisions made: ${context.decisionsCount}
Action items: ${context.actionsCount} (${context.completedActions} completed)
Transcript snippets:\n${context.transcript}

Generate a closing summary analyzing status, tempo, achievements, and recommendations.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits required, please add funds to your workspace." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || "{}";
    
    let summary;
    try {
      summary = JSON.parse(content);
    } catch {
      // Fallback summary
      summary = {
        overallStatus: meeting.status,
        tempo: "on-track",
        completionRate: Math.round((context.completedActions / Math.max(context.actionsCount, 1)) * 100),
        keyAchievements: ["Meeting completed"],
        openItems: [],
        nextSteps: [],
        meetingEffectiveness: 75,
        participationScore: 80,
        recommendations: ["Review action items"],
      };
    }

    // Store summary
    await supabase.from("meeting_summaries").insert({
      meeting_id: meetingId,
      summary_type: "closing",
      content: JSON.stringify(summary),
    });

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
