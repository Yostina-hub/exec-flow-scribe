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
    const { sourceId, content, title, sourceType } = await req.json();

    if (!sourceId || !content) {
      return new Response(
        JSON.stringify({ error: "Missing sourceId or content" }),
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

    // Construct comprehensive analysis prompt
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

    const userPrompt = `Document Type: ${sourceType || "Unknown"}
Title: ${title || "Untitled"}

Content:
${content}

Provide comprehensive executive intelligence analysis.`;

    console.log("Calling Lovable AI for document analysis...");

    // Call Lovable AI
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
      console.error("Lovable AI error:", aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    console.log("AI Analysis completed");

    // Store analysis in database
    const { error: updateError } = await supabase
      .from("notebook_sources")
      .update({
        metadata: {
          ai_analysis: analysis,
          analyzed_at: new Date().toISOString(),
          analysis_version: "1.0"
        }
      })
      .eq("id", sourceId);

    if (updateError) {
      console.error("Error storing analysis:", updateError);
      throw updateError;
    }

    // Extract and parse structured insights
    const insights = parseAnalysisInsights(analysis);

    // Calculate priority metrics
    const priorityScore = calculatePriorityScore(analysis, title || "");
    const urgencyLevel = determineUrgencyLevel(analysis, title || "");
    const responseDeadline = calculateResponseDeadline(urgencyLevel);

    // Store structured insights for quick access
    const { error: insightError } = await supabase
      .from("notebook_intelligence_insights")
      .insert({
        source_id: sourceId,
        insights: insights,
        full_analysis: analysis,
        priority_score: priorityScore,
        urgency_level: urgencyLevel,
        response_deadline: responseDeadline,
        requires_action: insights.recommendedActions.length > 0,
        created_at: new Date().toISOString()
      });

    if (insightError) {
      console.error("Error storing insights:", insightError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        insights,
        sourceId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-document-intelligence:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseAnalysisInsights(analysis: string) {
  // Extract structured data from the analysis
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
    // Simple pattern matching to extract sections
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

function calculatePriorityScore(analysis: string, title: string): number {
  const text = `${title} ${analysis}`.toLowerCase();
  let score = 5; // Base score
  
  // High priority keywords
  if (text.includes('urgent') || text.includes('critical') || text.includes('immediate')) score += 3;
  if (text.includes('deadline') || text.includes('asap')) score += 2;
  if (text.includes('ceo') || text.includes('executive') || text.includes('board')) score += 2;
  if (text.includes('crisis') || text.includes('emergency')) score += 3;
  if (text.includes('budget') || text.includes('financial') || text.includes('revenue')) score += 1;
  
  // Low priority keywords
  if (text.includes('fyi') || text.includes('informational')) score -= 2;
  if (text.includes('low priority')) score -= 3;
  
  return Math.max(1, Math.min(10, score)); // Clamp between 1-10
}

function determineUrgencyLevel(analysis: string, title: string): string {
  const text = `${title} ${analysis}`.toLowerCase();
  
  if (text.includes('critical') || text.includes('emergency') || text.includes('crisis')) {
    return 'critical';
  }
  if (text.includes('urgent') || text.includes('immediate') || text.includes('asap')) {
    return 'high';
  }
  if (text.includes('routine') || text.includes('fyi') || text.includes('low priority')) {
    return 'low';
  }
  return 'medium';
}

function calculateResponseDeadline(urgencyLevel: string): string {
  const now = new Date();
  
  switch (urgencyLevel) {
    case 'critical':
      // 4 hours
      now.setHours(now.getHours() + 4);
      break;
    case 'high':
      // 24 hours
      now.setDate(now.getDate() + 1);
      break;
    case 'medium':
      // 3 days
      now.setDate(now.getDate() + 3);
      break;
    case 'low':
      // 7 days
      now.setDate(now.getDate() + 7);
      break;
  }
  
  return now.toISOString();
}
