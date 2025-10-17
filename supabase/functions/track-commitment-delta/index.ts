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

    const { meeting_id } = await req.json();

    // Get commitments and related actions
    const { data: commitments } = await supabase
      .from("commitments")
      .select("*, action_items(*)")
      .eq("meeting_id", meeting_id);

    const { data: actions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting_id);

    // Analyze commitment drift
    const drifts = [];
    for (const commitment of commitments || []) {
      const relatedActions = actions?.filter(a => 
        a.title.toLowerCase().includes(commitment.commitment_text.toLowerCase()) ||
        commitment.commitment_text.toLowerCase().includes(a.title.toLowerCase())
      );

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${geminiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Analyze commitment vs reality:

Commitment: "${commitment.commitment_text}"
Due: ${commitment.due_date}
Related Actions: ${JSON.stringify(relatedActions?.map(a => ({ title: a.title, status: a.status, completed_at: a.completed_at })))}

Return JSON:
{
  "status": "fulfilled|partial|missed|revised",
  "drift_score": 0 to 1 (0 = perfect, 1 = complete miss),
  "fulfillment_evidence": "what actually happened",
  "course_correction": "suggested next steps"
}`
          }],
          tools: [{
            type: "function",
            function: {
              name: "analyze_drift",
              parameters: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  drift_score: { type: "number" },
                  fulfillment_evidence: { type: "string" },
                  course_correction: { type: "string" }
                },
                required: ["status", "drift_score", "fulfillment_evidence"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "analyze_drift" } }
        }),
      });

      const result = await aiResponse.json();
      const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const analysis = JSON.parse(analysisText);

      drifts.push({
        commitment_id: commitment.id,
        ...analysis
      });

      // Update commitment
      await supabase
        .from("commitments")
        .update({
          status: analysis.status,
          drift_score: analysis.drift_score,
          fulfillment_evidence: analysis.fulfillment_evidence
        })
        .eq("id", commitment.id);
    }

    return new Response(
      JSON.stringify({ success: true, drifts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error tracking commitment delta:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
