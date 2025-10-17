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

    const { query } = await req.json();

    // Parse natural language query with AI
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
          content: `Parse this knowledge graph query:
"${query}"

Examples:
- "Show every decision touching Vendor X" → find vendor entity, get related decisions
- "What outcomes followed from Q3 strategy decisions?" → find Q3 strategy decisions, get outcomes
- "Who worked on Project Alpha?" → find project entity, get person relationships

Return JSON:
{
  "entity_search": "what to search for",
  "entity_type": "person|topic|vendor|project",
  "relationship_types": ["decision|outcome|assignment"],
  "time_filter": "optional date range"
}`
        }],
        tools: [{
          type: "function",
          function: {
            name: "parse_query",
            parameters: {
              type: "object",
              properties: {
                entity_search: { type: "string" },
                entity_type: { type: "string" },
                relationship_types: { type: "array", items: { type: "string" } },
                time_filter: { type: "string" }
              },
              required: ["entity_search", "entity_type"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "parse_query" } }
      }),
    });

    const result = await aiResponse.json();
    const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(parsedText);

    // Search knowledge graph
    const { data: entities } = await supabase
      .from("knowledge_entities")
      .select("*")
      .eq("entity_type", parsed.entity_type)
      .ilike("entity_name", `%${parsed.entity_search}%`);

    if (!entities || entities.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: "No matching entities found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get relationships
    const entityIds = entities.map(e => e.id);
    const { data: relationships } = await supabase
      .from("knowledge_relationships")
      .select(`
        *,
        from_entity:knowledge_entities!from_entity_id(*),
        to_entity:knowledge_entities!to_entity_id(*),
        meetings(*),
        decisions(*)
      `)
      .in("from_entity_id", entityIds);

    return new Response(
      JSON.stringify({ 
        success: true, 
        entities,
        relationships,
        query_parsed: parsed
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error querying knowledge graph:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
