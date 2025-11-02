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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { meeting_id, user_id } = await req.json();

    if (!meeting_id || !user_id) {
      console.warn("Missing required fields:", { meeting_id, user_id });
      return new Response(
        JSON.stringify({ error: "meeting_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    console.log("Generating context capsule for user:", user_id, "meeting:", meeting_id);
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
              required: ["role_context", "key_points", "suggested_contribution"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_capsule" } }
      }),
    });

    let capsule: any;

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", status, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please retry in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
        );
      }
      if (status === 402) {
        // Fallback to direct Gemini API if available
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) {
          return new Response(
            JSON.stringify({ error: "Payment required. Please add credits to your AI workspace or configure a Gemini API key." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log("⚡ Falling back to Gemini for context capsule generation");
        const prompt = `Generate a 90-second pre-read for an attendee:

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
}`;
        const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }]}],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!geminiResp.ok) {
          const t = await geminiResp.text();
          console.error("Gemini fallback error:", geminiResp.status, t);
          return new Response(
            JSON.stringify({ error: "All AI providers failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const gJson = await geminiResp.json();
        const text = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          capsule = JSON.parse(jsonMatch[0]);
          console.log("✅ Extracted capsule from Gemini fallback");
        } else {
          throw new Error("Gemini fallback did not return valid JSON");
        }
      } else {
        throw new Error(`AI gateway error: ${status} - ${errorText}`);
      }
    }

    if (!capsule) {
      const result = await aiResponse.json();
      console.log("AI response received:", JSON.stringify(result).substring(0, 300));
      
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        capsule = JSON.parse(toolCall.function.arguments);
        console.log("✅ Extracted capsule from tool call");
      } else {
        console.warn("No tool call found, trying to extract from content");
        const content = result.choices?.[0]?.message?.content || "";
        console.log("Message content:", content.substring(0, 200));
        
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          capsule = JSON.parse(match[0]);
          console.log("✅ Extracted capsule from message content");
        } else {
          throw new Error("No tool call response from AI and could not extract JSON from content");
        }
      }
    }

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
