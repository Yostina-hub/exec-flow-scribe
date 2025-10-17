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

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, user_roles(roles(*))")
      .eq("id", user_id)
      .single();

    // Get meeting context
    const { data: meeting } = await supabase
      .from("meetings")
      .select("*, agenda_items(*)")
      .eq("id", meeting_id)
      .single();

    const { data: previousActions } = await supabase
      .from("action_items")
      .select("*")
      .eq("assigned_to", user_id)
      .eq("meeting_id", meeting_id);

    const { data: relatedDecisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meeting_id)
      .limit(5);

    // Generate personalized capsule
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
          content: `Generate a 90-second pre-read for an attendee:

Attendee: ${profile?.full_name}
Title: ${profile?.title}
Role: ${profile?.user_roles?.[0]?.roles?.name || 'Participant'}

Meeting: "${meeting?.title}"
Agenda: ${JSON.stringify(meeting?.agenda_items)}
Their previous actions: ${JSON.stringify(previousActions)}
Recent decisions: ${JSON.stringify(relatedDecisions)}

Return JSON (must be readable in 90 seconds):
{
  "role_context": "why they're here based on their role",
  "key_points": ["point1", "point2", "point3"],
  "suggested_contribution": "one specific thing they should contribute"
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "generate_capsule",
            parameters: {
              type: "object",
              properties: {
                role_context: { type: "string" },
                key_points: { type: "array", items: { type: "string" } },
                suggested_contribution: { type: "string" }
              },
              required: ["role_context", "key_points", "suggested_contribution"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_capsule" } }
      }),
    });

    const result = await aiResponse.json();
    const capsuleText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const capsule = JSON.parse(capsuleText);

    // Save capsule
    const { data: savedCapsule } = await supabase
      .from("context_capsules")
      .insert({
        meeting_id,
        user_id,
        role_context: capsule.role_context,
        key_points: capsule.key_points,
        suggested_contribution: capsule.suggested_contribution
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, capsule: savedCapsule }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating context capsule:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
