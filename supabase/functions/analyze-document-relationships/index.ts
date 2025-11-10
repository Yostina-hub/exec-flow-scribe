import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching documents with insights for user:", userId);

    // Get all documents with insights for this user
    const { data: insights, error: insightsError } = await supabase
      .from("notebook_intelligence_insights")
      .select(`
        id,
        source_id,
        insights,
        full_analysis,
        priority_score,
        urgency_level,
        notebook_sources (
          id,
          title,
          content,
          source_type,
          created_at
        )
      `)
      .eq("user_id", userId)
      .eq("requires_action", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (insightsError) {
      console.error("Error fetching insights:", insightsError);
      throw insightsError;
    }

    if (!insights || insights.length < 2) {
      console.log("Not enough documents to analyze relationships");
      return new Response(
        JSON.stringify({ message: "Not enough documents to analyze", relationships: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing relationships between ${insights.length} documents`);

    // Prepare document summaries for AI analysis
    const documentSummaries = insights.map((insight: any) => ({
      id: insight.source_id,
      title: insight.notebook_sources?.title || "Untitled",
      summary: (insight.insights as any)?.summary || "No summary available",
      keyPoints: (insight.insights as any)?.keyPoints || [],
      urgency: insight.urgency_level,
      priority: insight.priority_score,
    }));

    const relationships: any[] = [];

    // Analyze documents in pairs to find relationships
    for (let i = 0; i < documentSummaries.length; i++) {
      for (let j = i + 1; j < documentSummaries.length; j++) {
        const doc1 = documentSummaries[i];
        const doc2 = documentSummaries[j];

        console.log(`Analyzing relationship between "${doc1.title}" and "${doc2.title}"`);

        const analysisPrompt = `You are an executive intelligence system analyzing document relationships.

Document 1:
Title: ${doc1.title}
Summary: ${doc1.summary}
Key Points: ${doc1.keyPoints.join(", ")}

Document 2:
Title: ${doc2.title}
Summary: ${doc2.summary}
Key Points: ${doc2.keyPoints.join(", ")}

Analyze if these documents are related. Respond ONLY with a JSON object in this exact format:
{
  "isRelated": boolean,
  "relationshipType": "similar_topic" | "follow_up" | "contradicts" | "supports" | "referenced_in" | "prerequisite",
  "strength": number between 0 and 1,
  "summary": "Brief explanation of the relationship"
}

If not related, set isRelated to false and strength to 0.`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "user", content: analysisPrompt }
              ],
            }),
          });

          if (!aiResponse.ok) {
            console.error("AI analysis failed:", aiResponse.status);
            continue;
          }

          const aiData = await aiResponse.json();
          const responseText = aiData.choices[0].message.content;

          // Extract JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.log("No valid JSON found in AI response");
            continue;
          }

          const relationship = JSON.parse(jsonMatch[0]);

          if (relationship.isRelated && relationship.strength > 0.3) {
            relationships.push({
              source_document_id: doc1.id,
              related_document_id: doc2.id,
              relationship_type: relationship.relationshipType,
              relationship_strength: relationship.strength,
              relationship_summary: relationship.summary,
              user_id: userId,
            });

            console.log(`Found relationship: ${doc1.title} -> ${doc2.title} (${relationship.relationshipType}, strength: ${relationship.strength})`);
          }
        } catch (error) {
          console.error(`Error analyzing pair ${i}-${j}:`, error);
          continue;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`Found ${relationships.length} total relationships`);

    // Store relationships in database (upsert to avoid duplicates)
    if (relationships.length > 0) {
      for (const rel of relationships) {
        const { error: insertError } = await supabase
          .from("notebook_document_relationships")
          .upsert(rel, {
            onConflict: "source_document_id,related_document_id",
          });

        if (insertError) {
          console.error("Error storing relationship:", insertError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        relationshipsFound: relationships.length,
        relationships 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-document-relationships:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
