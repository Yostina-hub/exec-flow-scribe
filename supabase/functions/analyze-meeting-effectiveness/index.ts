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

    // Fetch meeting data
    const { data: meeting } = await supabase
      .from("meetings")
      .select("*, agenda_items(*)")
      .eq("id", meetingId)
      .single();

    // Fetch speaker analytics
    const { data: speakers } = await supabase
      .from("speaker_analytics")
      .select("*, profiles(full_name)")
      .eq("meeting_id", meetingId);

    // Fetch decisions
    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meetingId);

    // Fetch action items
    const { data: actions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meetingId);

    // Build context for AI
    const context = {
      duration: meeting?.duration || 0,
      agendaItems: meeting?.agenda_items?.length || 0,
      completedAgenda: meeting?.agenda_items?.filter((a: any) => a.status === 'completed').length || 0,
      speakers: speakers?.map((s: any) => ({
        name: s.profiles?.full_name || 'Unknown',
        speakingTime: s.speaking_time_seconds,
        engagement: s.engagement_score,
      })) || [],
      decisionsCount: decisions?.length || 0,
      actionsCount: actions?.length || 0,
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
            content: `Analyze meeting effectiveness and return JSON with this structure:
{
  "overallScore": <0-100>,
  "participationBalance": {
    "score": <0-100>,
    "dominantSpeakers": [<names>],
    "underrepresented": [<names>],
    "recommendation": "<string>"
  },
  "decisionQuality": {
    "score": <0-100>,
    "decisionsCount": <number>,
    "consensusLevel": "high|medium|low",
    "recommendation": "<string>"
  },
  "tempoAdherence": {
    "score": <0-100>,
    "status": "on-time|behind|ahead",
    "recommendation": "<string>"
  },
  "actionableRecommendations": [<strings>]
}`,
          },
          {
            role: "user",
            content: `Analyze this meeting data:
Duration: ${context.duration} minutes
Agenda: ${context.completedAgenda}/${context.agendaItems} items completed
Speakers: ${JSON.stringify(context.speakers)}
Decisions: ${context.decisionsCount}
Actions: ${context.actionsCount}

Provide effectiveness scoring and actionable recommendations.`,
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
    
    const scoring = JSON.parse(content);

    return new Response(JSON.stringify({ scoring }), {
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
