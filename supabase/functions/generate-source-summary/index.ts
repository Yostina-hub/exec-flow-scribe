import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceIds } = await req.json();

    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      throw new Error("Source IDs are required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Fetch source data
    const { data: sources, error: sourcesError } = await supabaseClient
      .from("notebook_sources")
      .select("*")
      .in("id", sourceIds);

    if (sourcesError) throw sourcesError;

    // Prepare content for AI
    let combinedContent = "";
    sources.forEach((source) => {
      combinedContent += `\n\n=== Source: ${source.title} (${source.source_type}) ===\n`;
      if (source.content) {
        combinedContent += source.content;
      } else if (source.external_url) {
        combinedContent += `URL: ${source.external_url}`;
      } else if (source.metadata) {
        combinedContent += `Metadata: ${JSON.stringify(source.metadata)}`;
      }
    });

    // Generate summary using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing and summarizing documents. Create a comprehensive yet concise overview that:
- Identifies the main topics and themes
- Highlights key information, decisions, and important details
- Notes significant dates, people, or entities mentioned
- Provides context about what these sources contain
Keep the summary clear and well-structured.`
          },
          {
            role: "user",
            content: `Please analyze and summarize the following ${sources.length} source(s):\n${combinedContent}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        summary,
        sourceCount: sources.length,
        sources: sources.map(s => ({ id: s.id, title: s.title, type: s.source_type }))
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});