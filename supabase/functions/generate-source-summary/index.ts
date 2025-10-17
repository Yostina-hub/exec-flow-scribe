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

    // Generate summary using Gemini API
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const systemPrompt = `You are an expert at analyzing and summarizing documents. Create a comprehensive summary that:
- Uses **bold markdown** for key terms, names, amounts, dates, and important concepts
- Identifies the main topics and themes with clear emphasis
- Highlights critical information like agreements, decisions, monetary values, and dates
- Notes significant people, organizations, or entities
- Provides clear context about what these sources contain
- Uses proper formatting with bold (**text**) for emphasis on important details

Format the summary as a single, well-structured paragraph with key information emphasized in bold.`;

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nPlease analyze and summarize the following ${sources.length} source(s):\n${combinedContent}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API Error:", aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.candidates[0].content.parts[0].text;

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