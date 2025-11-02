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

    const { meeting_id } = await req.json();

    // Get meeting transcripts
    const { data: transcripts } = await supabase
      .from("transcriptions")
      .select("*, speaker_name, content, timestamp")
      .eq("meeting_id", meeting_id)
      .order("timestamp");

    if (!transcripts || transcripts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcripts found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group transcripts into segments (5-minute chunks)
    const segments: Array<{ texts: string[]; start: string; end: string }> = [];
    let currentSegment: { texts: string[]; start: string; end: string } = { 
      texts: [], 
      start: transcripts[0].timestamp, 
      end: transcripts[0].timestamp 
    };
    
    for (const transcript of transcripts) {
      const timeDiff = new Date(transcript.timestamp).getTime() - new Date(currentSegment.start).getTime();
      
      if (timeDiff > 300000) { // 5 minutes
        segments.push(currentSegment);
        currentSegment = { texts: [transcript.content], start: transcript.timestamp, end: transcript.timestamp };
      } else {
        currentSegment.texts.push(transcript.content);
        currentSegment.end = transcript.timestamp;
      }
    }
    segments.push(currentSegment);

    // Analyze each segment
    const sentiments = [];
    for (const segment of segments) {
      const text = segment.texts.join(" ");
      
      let analysis;
      
      // Try OpenAI first
      if (openaiKey) {
        try {
          console.log("Attempting OpenAI for sentiment analysis");
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
                content: "You are a meeting sentiment analyzer. Return only valid JSON."
              }, {
                role: "user",
                content: `Analyze this meeting segment for sentiment, risks, and compliance concerns. Return JSON only:

Text: "${text}"

Return format:
{
  "topic": "main topic discussed",
  "sentiment_score": -1 to 1,
  "sentiment_label": "positive|neutral|negative|tension|optimistic|hesitant",
  "confidence": 0 to 1,
  "key_phrases": ["phrase1", "phrase2"],
  "risk_indicators": ["risk1", "risk2"],
  "compliance_concerns": ["concern1", "concern2"]
}`
              }],
              response_format: { type: "json_object" }
            }),
          });

          if (aiResponse.ok) {
            const result = await aiResponse.json();
            console.log("OpenAI response:", JSON.stringify(result).substring(0, 500));
            analysis = JSON.parse(result.choices[0].message.content);
            console.log("OpenAI analysis successful");
          } else {
            const errorText = await aiResponse.text();
            console.error("OpenAI API error:", aiResponse.status, errorText);
          }
        } catch (e) {
          console.error("OpenAI failed:", e);
        }
      }

      // Fallback to Gemini
      if (!analysis && geminiApiKey) {
        try {
          console.log("Attempting Gemini for sentiment analysis");
          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: `Analyze this meeting segment for sentiment, risks, and compliance concerns. Return JSON only:

Text: "${text}"

Return format:
{
  "topic": "main topic discussed",
  "sentiment_score": -1 to 1,
  "sentiment_label": "positive|neutral|negative|tension|optimistic|hesitant",
  "confidence": 0 to 1,
  "key_phrases": ["phrase1", "phrase2"],
  "risk_indicators": ["risk1", "risk2"],
  "compliance_concerns": ["concern1", "concern2"]
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
            analysis = JSON.parse(text);
            console.log("Gemini analysis successful");
          } else {
            const errorText = await aiResponse.text();
            console.error("Gemini API error:", aiResponse.status, errorText);
          }
        } catch (e) {
          console.error("Gemini failed:", e);
        }
      }

      // Final fallback: Lovable AI Gateway
      if (!analysis) {
        const lovableKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableKey) {
          try {
            console.log("Attempting Lovable AI for sentiment analysis");
            const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: "You are a meeting sentiment analyzer. Return only valid JSON with the required fields." },
                  { role: "user", content: `Analyze this meeting segment for sentiment, risks, and compliance concerns. Return JSON only.\n\nText: \"${text}\"\n\nReturn format:\n{\n  \"topic\": \"main topic discussed\",\n  \"sentiment_score\": -1 to 1,\n  \"sentiment_label\": \"positive|neutral|negative|tension|optimistic|hesitant\",\n  \"confidence\": 0 to 1,\n  \"key_phrases\": [\"phrase1\", \"phrase2\"],\n  \"risk_indicators\": [\"risk1\", \"risk2\"],\n  \"compliance_concerns\": [\"concern1\", \"concern2\"]\n}` },
                ],
              }),
            });

            if (resp.ok) {
              const data = await resp.json();
              const content = data.choices?.[0]?.message?.content ?? "";
              analysis = typeof content === "string" ? JSON.parse(content) : content;
              console.log("Lovable AI analysis successful");
            } else {
              const status = resp.status;
              const textBody = await resp.text();
              console.error("Lovable AI gateway error:", status, textBody);
              if (status === 429) {
                return new Response(JSON.stringify({ error: "⏳ Rate Limit Exceeded\n\nAll AI providers are temporarily rate limited. This is usually temporary.\n\n📋 What to do:\n• Wait 2-3 minutes and try again\n• If this persists, check your API provider dashboards\n• Contact support if the issue continues\n\nTip: Consider adding multiple AI provider keys in Settings to have automatic fallbacks.", technical_details: "Lovable AI rate limit exceeded.", status: 429 }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
              if (status === 402) {
                return new Response(JSON.stringify({ error: "💳 Payment Required\n\nYour AI provider credits have been exhausted.\n\n📋 What to do:\n1. Go to Settings → Workspace → Usage\n2. Add credits to your Lovable AI workspace\n3. Or add your own OpenAI/Gemini API keys in Settings\n\nOnce done, try generating minutes again.", technical_details: "Lovable AI: Payment required - please add credits to your workspace.", status: 402 }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
            }
          } catch (e) {
            console.error("Lovable AI fallback failed:", e);
          }
        }
      }

      if (!analysis) {
        throw new Error("All AI providers failed");
      }

      sentiments.push({
        meeting_id,
        segment_start: segment.start,
        segment_end: segment.end,
        ...analysis
      });
    }

    // Save sentiments
    await supabase.from("meeting_sentiment").insert(sentiments);

    return new Response(
      JSON.stringify({ success: true, sentiments }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error analyzing sentiment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
