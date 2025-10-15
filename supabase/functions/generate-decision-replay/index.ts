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

    const { decision_id } = await req.json();

    // Get decision details
    const { data: decision } = await supabase
      .from("decisions")
      .select("*, meetings(*)")
      .eq("id", decision_id)
      .single();

    if (!decision) {
      return new Response(
        JSON.stringify({ error: "Decision not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get transcripts around decision time
    const { data: transcripts } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", decision.meeting_id)
      .gte("timestamp", new Date(new Date(decision.timestamp).getTime() - 600000).toISOString())
      .lte("timestamp", new Date(new Date(decision.timestamp).getTime() + 600000).toISOString())
      .order("timestamp");

    // Analyze timeline with AI
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
          content: `Analyze this decision timeline and extract key segments:

Decision: "${decision.decision_text}"
Timestamp: ${decision.timestamp}

Transcripts: ${JSON.stringify(transcripts)}

Return JSON with timeline segments showing how the decision evolved:
{
  "segments": [
    {
      "segment_start": "ISO timestamp",
      "segment_end": "ISO timestamp",
      "context_before": "what was being discussed",
      "context_after": "result of this segment",
      "cited_data": ["data points mentioned"],
      "draft_snapshot": "how the decision draft looked at this point"
    }
  ]
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "create_timeline",
            parameters: {
              type: "object",
              properties: {
                segments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      segment_start: { type: "string" },
                      segment_end: { type: "string" },
                      context_before: { type: "string" },
                      context_after: { type: "string" },
                      cited_data: { type: "array", items: { type: "string" } },
                      draft_snapshot: { type: "string" }
                    },
                    required: ["segment_start", "segment_end", "context_before"]
                  }
                }
              },
              required: ["segments"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "create_timeline" } }
      }),
    });

    const result = await aiResponse.json();
    const timeline = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments);

    // Save segments
    const segmentsToInsert = timeline.segments.map((seg: any) => ({
      decision_id,
      meeting_id: decision.meeting_id,
      segment_start: seg.segment_start,
      segment_end: seg.segment_end,
      context_before: seg.context_before,
      context_after: seg.context_after,
      cited_data: seg.cited_data,
      draft_snapshot: { text: seg.draft_snapshot }
    }));

    await supabase.from("decision_timeline_segments").insert(segmentsToInsert);

    return new Response(
      JSON.stringify({ success: true, segments: segmentsToInsert }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating decision replay:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
