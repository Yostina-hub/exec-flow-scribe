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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { meeting_id, decision_id, scenarios, user_id } = await req.json();

    // Get decision context
    const { data: decision } = await supabase
      .from("decisions")
      .select("*")
      .eq("id", decision_id)
      .single();

    // Get related data for simulation
    const { data: relatedActions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting_id)
      .limit(10);

    const { data: previousOutcomes } = await supabase
      .from("decision_outcomes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // Generate simulations with AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${geminiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{
          role: "user",
          content: `Simulate outcomes for strategic decision:

Decision: "${decision?.decision_text}"

Scenario options to simulate:
${scenarios.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

Context:
- Current actions: ${JSON.stringify(relatedActions)}
- Historical outcomes: ${JSON.stringify(previousOutcomes)}

For each scenario, return JSON:
{
  "simulations": [
    {
      "scenario_name": "Scenario A",
      "scenario_description": "brief description",
      "assumptions": ["assumption1", "assumption2"],
      "projected_outcomes": {
        "timeline": "timeframe",
        "costs": "estimated costs",
        "benefits": "estimated benefits",
        "risks": ["risk1", "risk2"]
      },
      "impact_score": 0-100,
      "confidence_level": 0-1
    }
  ]
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "simulate_outcomes",
            parameters: {
              type: "object",
              properties: {
                simulations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      scenario_name: { type: "string" },
                      scenario_description: { type: "string" },
                      assumptions: { type: "array", items: { type: "string" } },
                      projected_outcomes: { type: "object" },
                      impact_score: { type: "number" },
                      confidence_level: { type: "number" }
                    },
                    required: ["scenario_name", "projected_outcomes", "impact_score"]
                  }
                }
              },
              required: ["simulations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "simulate_outcomes" } }
      }),
    });

    const result = await aiResponse.json();
    const simulations = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments);

    // Save simulations
    const simulationsToInsert = simulations.simulations.map((sim: any) => ({
      meeting_id,
      decision_id,
      scenario_name: sim.scenario_name,
      scenario_description: sim.scenario_description,
      assumptions: sim.assumptions,
      projected_outcomes: sim.projected_outcomes,
      impact_score: sim.impact_score,
      confidence_level: sim.confidence_level,
      data_sources: { actions: relatedActions?.length, outcomes: previousOutcomes?.length },
      created_by: user_id
    }));

    await supabase.from("outcome_simulations").insert(simulationsToInsert);

    return new Response(
      JSON.stringify({ success: true, simulations: simulationsToInsert }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error simulating outcomes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
