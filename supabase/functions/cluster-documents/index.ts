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

    console.log("Fetching documents for clustering:", userId);

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
          source_type,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (insightsError) {
      console.error("Error fetching insights:", insightsError);
      throw insightsError;
    }

    if (!insights || insights.length < 3) {
      console.log("Not enough documents for clustering");
      return new Response(
        JSON.stringify({ message: "Not enough documents for clustering", clusters: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Clustering ${insights.length} documents`);

    // Prepare document summaries for AI clustering
    const documentSummaries = insights.map((insight: any) => ({
      id: insight.source_id,
      title: insight.notebook_sources?.title || "Untitled",
      summary: (insight.insights as any)?.summary || "",
      keyPoints: (insight.insights as any)?.keyPoints || [],
      sourceType: insight.notebook_sources?.source_type || "unknown",
    }));

    const clusteringPrompt = `You are an executive intelligence system that organizes documents into thematic clusters.

Analyze these ${documentSummaries.length} documents and group them into 3-7 meaningful thematic clusters:

${documentSummaries.map((doc, i) => `
Document ${i + 1}:
- ID: ${doc.id}
- Title: ${doc.title}
- Summary: ${doc.summary}
- Key Points: ${doc.keyPoints.slice(0, 3).join(", ")}
`).join("\n")}

Create logical clusters based on:
- Topic similarity
- Strategic themes
- Business functions
- Urgency/priority patterns
- Subject matter domains

Respond ONLY with a JSON object in this exact format:
{
  "clusters": [
    {
      "name": "Cluster name (e.g., 'Financial Planning', 'HR & Talent', 'Strategic Initiatives')",
      "description": "Brief description of what unifies these documents",
      "theme": "One-word theme (e.g., 'Finance', 'Operations', 'Strategy')",
      "color": "A color name (red, blue, green, purple, orange, pink, yellow, teal)",
      "documentIds": ["doc-id-1", "doc-id-2", ...],
      "priority": "high" | "medium" | "low"
    }
  ]
}

Ensure every document is assigned to exactly one cluster.`;

    console.log("Calling AI for document clustering...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: clusteringPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI clustering failed:", aiResponse.status, errorText);
      throw new Error(`AI clustering failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;

    console.log("AI clustering response received");

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }

    const clusteringResult = JSON.parse(jsonMatch[0]);

    // Enrich clusters with document metadata
    const enrichedClusters = clusteringResult.clusters.map((cluster: any) => {
      const clusterDocs = insights.filter((insight: any) => 
        cluster.documentIds.includes(insight.source_id)
      );

      return {
        ...cluster,
        documentCount: clusterDocs.length,
        documents: clusterDocs.map((insight: any) => ({
          id: insight.source_id,
          title: insight.notebook_sources?.title || "Untitled",
          sourceType: insight.notebook_sources?.source_type,
          urgency: insight.urgency_level,
          priority: insight.priority_score,
          createdAt: insight.notebook_sources?.created_at,
        })),
        avgPriority: clusterDocs.reduce((sum: number, doc: any) => sum + (doc.priority_score || 0), 0) / clusterDocs.length,
        hasUrgent: clusterDocs.some((doc: any) => doc.urgency_level === "critical" || doc.urgency_level === "high"),
      };
    });

    console.log(`Created ${enrichedClusters.length} clusters`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        clustersFound: enrichedClusters.length,
        clusters: enrichedClusters,
        totalDocuments: insights.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in cluster-documents:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
