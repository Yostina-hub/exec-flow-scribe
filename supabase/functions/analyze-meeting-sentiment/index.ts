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
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
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
          tools: [{
            type: "function",
            function: {
              name: "analyze_sentiment",
              parameters: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  sentiment_score: { type: "number" },
                  sentiment_label: { type: "string" },
                  confidence: { type: "number" },
                  key_phrases: { type: "array", items: { type: "string" } },
                  risk_indicators: { type: "array", items: { type: "string" } },
                  compliance_concerns: { type: "array", items: { type: "string" } }
                },
                required: ["topic", "sentiment_score", "sentiment_label", "confidence"]
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "analyze_sentiment" } }
        }),
      });

      const result = await aiResponse.json();
      const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const analysis = JSON.parse(analysisText);

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
