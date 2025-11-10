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
    const { sourceId } = await req.json();

    if (!sourceId) {
      return new Response(
        JSON.stringify({ error: "Missing sourceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting auto-analysis for source:", sourceId);

    // Fetch source data
    const { data: source, error: sourceError } = await supabase
      .from("notebook_sources")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (sourceError || !source) {
      console.error("Error fetching source:", sourceError);
      throw new Error("Source not found");
    }

    // Check if source has content
    if (!source.content || (source.content as string).trim().length < 50) {
      console.log("Source content too short, skipping analysis");
      return new Response(
        JSON.stringify({ success: true, message: "Content too short for analysis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already analyzed
    const { data: existingAnalysis } = await supabase
      .from("notebook_intelligence_insights")
      .select("id")
      .eq("source_id", sourceId)
      .limit(1);

    if (existingAnalysis && existingAnalysis.length > 0) {
      console.log("Source already has analysis, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Already analyzed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Start background analysis using waitUntil
    const analysisPromise = performAnalysis(supabase, source);
    
    // @ts-ignore - EdgeRuntime is available in Deno environment
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(analysisPromise);
      console.log("Background analysis task started");
    } else {
      // Fallback: start the analysis but don't wait for it
      analysisPromise.catch(err => console.error("Analysis failed:", err));
    }

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Analysis started in background",
        sourceId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in auto-analyze-source:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function performAnalysis(supabase: any, source: any) {
  try {
    console.log("Performing analysis for source:", source.id);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are an Executive AI Advisor analyzing documents for senior leadership.
Your role is to provide strategic intelligence, actionable insights, and decision support.

Analyze the document comprehensively and provide:
1. Executive Summary (3-5 lines maximum - the absolute essence)
2. Key Points & Decisions (bullet points of critical elements)
3. Strategic Implications (how this affects the organization)
4. Intelligent Questions (3-5 questions the executive should consider)
5. Recommended Actions (specific next steps with priority)
6. Risk Assessment (potential concerns or red flags)
7. Related Context (what else this connects to)
8. Draft Response Guidance (tone and key points for reply)

Be precise, strategic, and executive-focused. Think like a senior advisor.`;

    const userPrompt = `Document Type: ${source.source_type || "Unknown"}
Title: ${source.title || "Untitled"}

Content:
${source.content}

Provide comprehensive executive intelligence analysis.`;

    console.log("Calling Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    console.log("AI analysis completed");

    // Parse insights
    const insights = parseAnalysisInsights(analysis);

    // Store analysis in source metadata
    const currentMetadata = (source.metadata || {}) as Record<string, any>;
    const { error: updateError } = await supabase
      .from("notebook_sources")
      .update({
        metadata: {
          ...currentMetadata,
          ai_analysis: analysis,
          analyzed_at: new Date().toISOString(),
          analysis_version: "1.0",
          auto_analyzed: true
        }
      })
      .eq("id", source.id);

    if (updateError) {
      console.error("Error updating source:", updateError);
      throw updateError;
    }

    // Store structured insights
    const { error: insightError } = await supabase
      .from("notebook_intelligence_insights")
      .insert({
        source_id: source.id,
        insights: insights,
        full_analysis: analysis,
        created_at: new Date().toISOString()
      });

    if (insightError) {
      console.error("Error storing insights:", insightError);
      throw insightError;
    }

    console.log("Analysis completed and stored successfully");
  } catch (error) {
    console.error("Error in performAnalysis:", error);
    throw error;
  }
}

function parseAnalysisInsights(analysis: string) {
  const insights: any = {
    summary: "",
    keyPoints: [],
    strategicImplications: "",
    questions: [],
    recommendedActions: [],
    riskAssessment: "",
    relatedContext: "",
    responseGuidance: ""
  };

  try {
    const summaryMatch = analysis.match(/Executive Summary[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i);
    if (summaryMatch) insights.summary = summaryMatch[1].trim();

    const keyPointsMatch = analysis.match(/Key Points[^:]*:([^#]+?)(?=\n\n|\n[0-9]\.|\n[A-Z]|$)/is);
    if (keyPointsMatch) {
      insights.keyPoints = keyPointsMatch[1]
        .split(/\n/)
        .filter(line => line.trim().match(/^[-•*]|\d\./))
        .map(line => line.replace(/^[-•*]|\d\./, '').trim())
        .filter(Boolean);
    }

    const questionsMatch = analysis.match(/Intelligent Questions[^:]*:([^#]+?)(?=\n\n|\n[0-9]\.|\n[A-Z]|$)/is);
    if (questionsMatch) {
      insights.questions = questionsMatch[1]
        .split(/\n/)
        .filter(line => line.trim().match(/^[-•*]|\d\./))
        .map(line => line.replace(/^[-•*]|\d\./, '').trim())
        .filter(Boolean);
    }

    const actionsMatch = analysis.match(/Recommended Actions[^:]*:([^#]+?)(?=\n\n|\n[0-9]\.|\n[A-Z]|$)/is);
    if (actionsMatch) {
      insights.recommendedActions = actionsMatch[1]
        .split(/\n/)
        .filter(line => line.trim().match(/^[-•*]|\d\./))
        .map(line => line.replace(/^[-•*]|\d\./, '').trim())
        .filter(Boolean);
    }

    const riskMatch = analysis.match(/Risk Assessment[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i);
    if (riskMatch) insights.riskAssessment = riskMatch[1].trim();

    const responseMatch = analysis.match(/Draft Response Guidance[:\s]+([^\n]+(?:\n(?![A-Z])[^\n]+)*)/i);
    if (responseMatch) insights.responseGuidance = responseMatch[1].trim();

  } catch (parseError) {
    console.error("Error parsing insights:", parseError);
  }

  return insights;
}
