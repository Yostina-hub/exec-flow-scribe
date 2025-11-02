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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { meeting_id, user_id } = await req.json();

    // Get meeting details
    const { data: meeting } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meeting_id)
      .single();

    // Get action status
    const { data: actions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting_id);

    // Get recent decisions
    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meeting_id);

    // Get sentiment/risks
    const { data: sentiments } = await supabase
      .from("meeting_sentiment")
      .select("*")
      .eq("meeting_id", meeting_id);

    let brief;
    
    // Try OpenAI first
    if (openaiKey) {
      try {
        console.log("Attempting OpenAI for executive brief");
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{
              role: "system",
              content: "You are an executive briefing generator. Return only valid JSON."
            }, {
              role: "user",
              content: `Generate a 1-page executive brief for upcoming meeting:

Meeting: "${meeting.title}"
Date: ${meeting.start_time}

Context:
- Actions: ${actions?.length || 0} total, ${actions?.filter(a => a.status === 'completed').length || 0} completed
- Decisions: ${decisions?.length || 0}
- Risks: ${sentiments?.filter(s => s.risk_indicators?.length > 0).length || 0}

Data: ${JSON.stringify({ actions: actions?.slice(0, 10), decisions, sentiments })}

Return JSON with:
{
  "key_insights": ["insight1", "insight2", "insight3"],
  "action_status_summary": {
    "total": number,
    "completed": number,
    "at_risk": number,
    "blocked": number
  },
  "risk_alerts": ["risk1", "risk2"],
  "recommended_focus": ["focus1", "focus2", "focus3"],
  "one_page_brief": "markdown formatted executive summary"
}`
            }],
            response_format: { type: "json_object" }
          }),
        });

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          console.log("OpenAI response:", JSON.stringify(result).substring(0, 500));
          brief = JSON.parse(result.choices[0].message.content);
          console.log("OpenAI brief successful");
        } else {
          const errorText = await aiResponse.text();
          console.error("OpenAI API error:", aiResponse.status, errorText);
        }
      } catch (e) {
        console.error("OpenAI failed:", e);
      }
    }

    // Fallback to Gemini
    if (!brief && geminiApiKey) {
      try {
        console.log("Attempting Gemini for executive brief");
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate a 1-page executive brief for upcoming meeting:

Meeting: "${meeting.title}"
Date: ${meeting.start_time}

Context:
- Actions: ${actions?.length || 0} total
- Decisions: ${decisions?.length || 0}

Return JSON:
{
  "key_insights": ["insight1", "insight2"],
  "action_status_summary": {
    "total": ${actions?.length || 0},
    "completed": ${actions?.filter(a => a.status === 'completed').length || 0},
    "at_risk": 0,
    "blocked": 0
  },
  "risk_alerts": [],
  "recommended_focus": ["focus1", "focus2"],
  "one_page_brief": "markdown summary"
}`
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json"
              }
            }),
          }
        );

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          console.log("Gemini response:", JSON.stringify(result).substring(0, 500));
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          brief = JSON.parse(text);
          console.log("Gemini brief successful");
        } else {
          const errorText = await aiResponse.text();
          console.error("Gemini API error:", aiResponse.status, errorText);
        }
      } catch (e) {
        console.error("Gemini failed:", e);
      }
    }

    if (!brief) {
      // Final fallback: Lovable AI Gateway
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableApiKey) {
        try {
          console.log("Attempting Lovable AI for executive brief");
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{
                role: "system",
                content: "You are an executive briefing generator. Return only valid JSON."
              }, {
                role: "user",
                content: `Generate a 1-page executive brief for upcoming meeting:

Meeting: "${meeting.title}"
Date: ${meeting.start_time}

Context:
- Actions: ${actions?.length || 0} total, ${actions?.filter(a => a.status === 'completed').length || 0} completed
- Decisions: ${decisions?.length || 0}
- Risks: ${sentiments?.filter(s => s.risk_indicators?.length > 0).length || 0}

Data: ${JSON.stringify({ actions: actions?.slice(0, 10), decisions, sentiments })}

Return JSON with:
{
  "key_insights": ["insight1", "insight2", "insight3"],
  "action_status_summary": {
    "total": number,
    "completed": number,
    "at_risk": number,
    "blocked": number
  },
  "risk_alerts": ["risk1", "risk2"],
  "recommended_focus": ["focus1", "focus2", "focus3"],
  "one_page_brief": "markdown formatted executive summary"
}`
              }],
              response_format: { type: "json_object" }
            }),
          });

          if (aiResponse.ok) {
            const result = await aiResponse.json();
            console.log("Lovable AI response:", JSON.stringify(result).substring(0, 500));
            brief = JSON.parse(result.choices[0].message.content);
            console.log("Lovable AI brief successful");
          } else {
            const status = aiResponse.status;
            const errorText = await aiResponse.text();
            console.error("Lovable AI gateway error:", status, errorText);
            if (status === 429) {
              return new Response(
                JSON.stringify({ error: "Rate limit exceeded. Please retry in a minute." }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
              );
            }
            if (status === 402) {
              return new Response(
                JSON.stringify({ error: "Payment required. Please add credits to your AI workspace." }),
                { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } catch (e) {
          console.error("Lovable AI failed:", e);
        }
      }

      if (!brief) {
        throw new Error("All AI providers failed");
      }
    }

    // Save brief
    const { data: savedBrief } = await supabase
      .from("executive_briefs")
      .insert({
        meeting_id,
        created_for: user_id,
        brief_content: { one_page_brief: brief.one_page_brief },
        key_insights: brief.key_insights,
        action_status_summary: brief.action_status_summary,
        risk_alerts: brief.risk_alerts || [],
        recommended_focus: brief.recommended_focus,
        sources: { actions_count: actions?.length, decisions_count: decisions?.length }
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ success: true, brief: savedBrief }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating executive brief:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
