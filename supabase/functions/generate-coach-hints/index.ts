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

    const { meeting_id, user_id } = await req.json();

    // Get meeting data
    const { data: meeting } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meeting_id)
      .single();

    const { data: agenda } = await supabase
      .from("agenda_items")
      .select("*")
      .eq("meeting_id", meeting_id)
      .order("order_index");

    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meeting_id);

    const { data: attendees } = await supabase
      .from("meeting_attendees")
      .select("*, profiles(*)")
      .eq("meeting_id", meeting_id);

    const { data: transcripts } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", meeting_id)
      .order("timestamp", { ascending: false })
      .limit(20);

    // Calculate meeting progress
    const now = new Date();
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    const remaining = endTime.getTime() - now.getTime();
    
    // Generate hints with AI
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
          content: `Generate executive coach hints for a meeting in progress:

Meeting time remaining: ${Math.round(remaining / 60000)} minutes
Total agenda items: ${agenda?.length || 0}
Completed items: ${agenda?.filter(a => a.status === 'completed').length || 0}
Decisions made: ${decisions?.length || 0}
Attendees: ${JSON.stringify(attendees?.map(a => ({ name: a.profiles?.full_name, spoken: false })))}
Recent discussion: ${JSON.stringify(transcripts?.slice(0, 5))}

Return JSON with coaching hints:
{
  "hints": [
    {
      "hint_type": "time|participation|progress|decision",
      "hint_message": "actionable coaching message",
      "priority": 0-10
    }
  ]
}

Examples:
- "10 mins left; 3 decisions remain"
- "Finance has not spoken on Item 2"
- "Consider asking for a clear owner"
- "Agenda running 15 mins behind"`
        }],
        tools: [{
          type: "function",
          function: {
            name: "generate_hints",
            parameters: {
              type: "object",
              properties: {
                hints: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      hint_type: { type: "string" },
                      hint_message: { type: "string" },
                      priority: { type: "number" }
                    },
                    required: ["hint_type", "hint_message", "priority"]
                  }
                }
              },
              required: ["hints"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_hints" } }
      }),
    });

    const result = await aiResponse.json();
    const coaching = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments);

    // Save hints
    const hintsToInsert = coaching.hints.map((hint: any) => ({
      meeting_id,
      user_id,
      hint_type: hint.hint_type,
      hint_message: hint.hint_message,
      priority: hint.priority,
      expires_at: new Date(endTime.getTime() + 3600000).toISOString()
    }));

    await supabase.from("executive_coach_hints").insert(hintsToInsert);

    return new Response(
      JSON.stringify({ success: true, hints: hintsToInsert }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating coach hints:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
