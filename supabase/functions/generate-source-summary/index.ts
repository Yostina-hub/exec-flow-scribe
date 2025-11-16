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
    const { sourceIds, targetLanguage } = await req.json();

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

    const languageInstruction = targetLanguage 
      ? `IMPORTANT: Generate the summary in ${targetLanguage} language, translating the content as needed.`
      : `Detect the primary language of the sources and create your summary in THE SAME LANGUAGE as the sources.`;

    const systemPrompt = `You are an expert at analyzing and summarizing documents in ANY language including Amharic (አማርኛ), Arabic, Hebrew, Chinese, Japanese, and all other languages.

CRITICAL INSTRUCTIONS:
1. ${languageInstruction}
2. If sources are in multiple languages and no target language is specified, use the dominant language
3. Use **bold markdown** for key terms, names, amounts, dates, and important concepts
4. Create a structured summary with clear sections
5. Highlight critical information like agreements, decisions, monetary values, and dates
6. Note significant people, organizations, or entities
7. Extract key insights and takeaways
8. Provide clear context about what these sources contain

Format the summary with:
- A brief overview paragraph (2-3 sentences) at the start
- Key Topics section with bullet points
- Main Insights section with emphasized points
- Use markdown formatting for clarity`;

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
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please analyze and summarize the following ${sources.length} source(s):\n\n${combinedContent.substring(0, 50000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI Error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      } else if (aiResponse.status === 402) {
        throw new Error("AI usage limit reached. Please add credits to your workspace.");
      }
      
      throw new Error(`AI generation error: ${aiResponse.status}`);
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