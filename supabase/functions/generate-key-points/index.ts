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
    const { meetingId } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: "Meeting ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("title, description")
      .eq("id", meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Fetch transcriptions
    const { data: transcriptions, error: transError } = await supabase
      .from("transcriptions")
      .select("content, speaker_name, timestamp")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });

    if (transError) throw transError;

    // Fetch minutes if available
    const { data: minutes } = await supabase
      .from("minutes_versions")
      .select("content")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Prepare content for AI
    let content = `Meeting: ${meeting.title}\n`;
    if (meeting.description) content += `Description: ${meeting.description}\n\n`;

    if (minutes?.content) {
      content += `Minutes:\n${minutes.content}\n\n`;
    }

    if (transcriptions && transcriptions.length > 0) {
      content += "Transcription:\n";
      transcriptions.forEach((t) => {
        content += `${t.speaker_name}: ${t.content}\n`;
      });
    }

    // Call Lovable AI to extract key points
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert meeting analyst. Extract the most important key points from meetings.
            
Format your response as a JSON object with this structure:
{
  "summary": "Brief 2-3 sentence overview",
  "keyPoints": ["point 1", "point 2", "point 3", ...],
  "decisions": ["decision 1", "decision 2", ...],
  "actionItems": ["action 1", "action 2", ...],
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}

Focus on:
- Main topics discussed
- Key decisions made
- Important action items
- Notable insights or conclusions
- Critical keywords for searchability`
          },
          {
            role: "user",
            content: `Extract key points from this meeting:\n\n${content}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_key_points",
              description: "Extract structured key points from meeting content",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  keyPoints: {
                    type: "array",
                    items: { type: "string" }
                  },
                  decisions: {
                    type: "array",
                    items: { type: "string" }
                  },
                  actionItems: {
                    type: "array",
                    items: { type: "string" }
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["summary", "keyPoints", "decisions", "actionItems", "keywords"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_key_points" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const keyPoints = JSON.parse(toolCall.function.arguments);

    // Save to database
    const { error: saveError } = await supabase
      .from("meeting_summaries")
      .upsert({
        meeting_id: meetingId,
        summary_type: "key_points",
        content: JSON.stringify(keyPoints),
        model_used: "google/gemini-2.5-flash"
      });

    if (saveError) console.error("Error saving key points:", saveError);

    return new Response(
      JSON.stringify({ success: true, keyPoints }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating key points:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
