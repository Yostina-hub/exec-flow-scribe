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

    const { meeting_id, user_id, content, audience_type } = await req.json();

    // Generate redacted version with AI
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
          content: `Create a redacted version for ${audience_type} circulation:

Original content:
${content}

Mask:
- Named individuals in HR contexts (replace with roles)
- Specific salary/compensation figures (replace with ranges)
- Legal case names/parties (replace with generic descriptors)
- But keep document readable and meaningful

Return JSON:
{
  "redacted_content": "redacted version",
  "redaction_map": {
    "entity_type": ["list of redacted items"]
  },
  "sensitivity_level": "low|medium|high"
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "create_redaction",
            parameters: {
              type: "object",
              properties: {
                redacted_content: { type: "string" },
                redaction_map: { type: "object" },
                sensitivity_level: { type: "string" }
              },
              required: ["redacted_content", "redaction_map", "sensitivity_level"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "create_redaction" } }
      }),
    });

    const result = await aiResponse.json();
    const redaction = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments);

    // Save redacted version
    const { data: savedDoc } = await supabase
      .from("redacted_documents")
      .insert({
        meeting_id,
        original_content: content,
        redacted_content: redaction.redacted_content,
        redaction_map: redaction.redaction_map,
        sensitivity_level: redaction.sensitivity_level,
        audience_type,
        created_by: user_id
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, document: savedDoc }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating redacted version:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
