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

    const { meeting_id, user_id, left_at } = await req.json();

    // Get what happened since user left
    const { data: newDecisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meeting_id)
      .gte("created_at", left_at);

    const { data: newActions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting_id)
      .gte("created_at", left_at);

    const { data: transcripts } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", meeting_id)
      .gte("timestamp", left_at)
      .order("timestamp");

    // Generate catch-up with AI
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
          content: `Generate a catch-up card for someone who left a meeting and is returning:

User left at: ${left_at}

What happened since:
- Decisions: ${JSON.stringify(newDecisions)}
- New actions: ${JSON.stringify(newActions)}
- Discussion: ${JSON.stringify(transcripts?.slice(0, 20))}

Return JSON:
{
  "key_changes": {
    "summary": "brief overview of what changed",
    "critical_updates": ["update1", "update2"]
  },
  "suggested_questions": ["question to ask to re-engage"],
  "missed_decisions": ["decision titles"],
  "missed_actions": ["action titles"]
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "generate_catchup",
            parameters: {
              type: "object",
              properties: {
                key_changes: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    critical_updates: { type: "array", items: { type: "string" } }
                  }
                },
                suggested_questions: { type: "array", items: { type: "string" } },
                missed_decisions: { type: "array", items: { type: "string" } },
                missed_actions: { type: "array", items: { type: "string" } }
              },
              required: ["key_changes", "suggested_questions"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_catchup" } }
      }),
    });

    const result = await aiResponse.json();
    const catchup = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments);

    // Save catch-up card
    const { data: savedCard } = await supabase
      .from("interruption_catchups")
      .insert({
        meeting_id,
        user_id,
        left_at,
        key_changes: catchup.key_changes,
        suggested_questions: catchup.suggested_questions,
        missed_decisions: catchup.missed_decisions || [],
        missed_actions: catchup.missed_actions || []
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, catchup: savedCard }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating catch-up card:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
