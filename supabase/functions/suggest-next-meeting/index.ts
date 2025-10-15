import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { meeting_id } = await req.json();

    // Get meeting context
    const { data: meeting } = await supabase
      .from("meetings")
      .select("*, meeting_attendees(user_id, profiles(full_name, email))")
      .eq("id", meeting_id)
      .single();

    // Get open actions
    const { data: openActions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting_id)
      .neq("status", "completed");

    // Get unresolved commitments
    const { data: unresolvedCommitments } = await supabase
      .from("commitments")
      .select("*")
      .eq("meeting_id", meeting_id)
      .in("status", ["pending", "partial"]);

    // Get risks
    const { data: risks } = await supabase
      .from("meeting_sentiment")
      .select("*")
      .eq("meeting_id", meeting_id)
      .not("risk_indicators", "is", null);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: `Generate next meeting suggestion:

Previous Meeting: "${meeting.title}"
Open Actions: ${openActions?.length || 0}
Unresolved Commitments: ${unresolvedCommitments?.length || 0}
Risk Areas: ${risks?.map(r => r.risk_indicators).flat().join(", ")}

Context:
${JSON.stringify({ openActions: openActions?.slice(0, 5), unresolvedCommitments: unresolvedCommitments?.slice(0, 3) })}

Return JSON:
{
  "title": "suggested meeting title",
  "suggested_for": "YYYY-MM-DD",
  "agenda": [
    {"topic": "topic1", "duration_minutes": 15, "priority": "high"},
    {"topic": "topic2", "duration_minutes": 10, "priority": "medium"}
  ],
  "reasoning": "why this meeting is needed",
  "priority_score": 0 to 1,
  "upcoming_milestones": ["milestone1", "milestone2"]
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "suggest_meeting",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                suggested_for: { type: "string" },
                agenda: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic: { type: "string" },
                      duration_minutes: { type: "number" },
                      priority: { type: "string" }
                    }
                  }
                },
                reasoning: { type: "string" },
                priority_score: { type: "number" },
                upcoming_milestones: { type: "array", items: { type: "string" } }
              },
              required: ["title", "suggested_for", "agenda", "reasoning", "priority_score"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_meeting" } }
      }),
    });

    const result = await aiResponse.json();
    const suggestion = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments);

    // Save suggestion
    const { data: savedSuggestion } = await supabase
      .from("meeting_suggestions")
      .insert({
        meeting_id,
        suggested_title: suggestion.title,
        suggested_for: suggestion.suggested_for,
        suggested_agenda: suggestion.agenda,
        suggested_attendees: meeting.meeting_attendees?.map((a: any) => a.user_id),
        reasoning: suggestion.reasoning,
        open_threads: openActions?.length || 0,
        unresolved_risks: risks?.length || 0,
        upcoming_milestones: suggestion.upcoming_milestones || [],
        priority_score: suggestion.priority_score
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, suggestion: savedSuggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error suggesting next meeting:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
