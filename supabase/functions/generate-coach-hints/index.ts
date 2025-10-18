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

    // Get meeting data
    const { data: meeting } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", meeting_id)
      .single();

    const { data: agenda } = await supabase
      .from("agenda_items")
      .select("*")
      .eq("meeting_id", meeting_id)
      .order("order_index");

    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meeting_id);

    const { data: attendees } = await supabase
      .from("meeting_attendees")
      .select("*, profiles(*)")
      .eq("meeting_id", meeting_id);

    const { data: transcripts } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", meeting_id)
      .order("timestamp", { ascending: false })
      .limit(20);

    // Calculate meeting progress
    const now = new Date();
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    const remaining = endTime.getTime() - now.getTime();
    
    // Generate hints with AI
    let coaching;
    
    // Try OpenAI first
    if (openaiKey) {
      try {
        console.log("Attempting OpenAI for coach hints");
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
              content: "You are an executive meeting coach. Return only valid JSON."
            }, {
              role: "user",
              content: `Generate executive coach hints for a meeting in progress:

Meeting time remaining: ${Math.round(remaining / 60000)} minutes
Total agenda items: ${agenda?.length || 0}
Completed items: ${agenda?.filter(a => a.status === 'completed').length || 0}
Decisions made: ${decisions?.length || 0}
Attendees: ${JSON.stringify(attendees?.map(a => ({ name: a.profiles?.full_name, spoken: false })))}
Recent discussion: ${JSON.stringify(transcripts?.slice(0, 5))}

Return JSON with coaching hints:
{
  "hints": [
    {
      "hint_type": "time|participation|progress|decision",
      "hint_message": "actionable coaching message",
      "priority": 0-10
    }
  ]
}

Examples:
- "10 mins left; 3 decisions remain"
- "Finance has not spoken on Item 2"
- "Consider asking for a clear owner"
- "Agenda running 15 mins behind"`
            }],
            response_format: { type: "json_object" }
          }),
        });

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          console.log("OpenAI response:", JSON.stringify(result).substring(0, 500));
          coaching = JSON.parse(result.choices[0].message.content);
          console.log("OpenAI coaching successful");
        } else {
          const errorText = await aiResponse.text();
          console.error("OpenAI API error:", aiResponse.status, errorText);
        }
      } catch (e) {
        console.error("OpenAI failed:", e);
      }
    }

    // Fallback to Gemini
    if (!coaching && geminiApiKey) {
      try {
        console.log("Attempting Gemini for coach hints");
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate executive coach hints for a meeting in progress:

Meeting time remaining: ${Math.round(remaining / 60000)} minutes
Total agenda items: ${agenda?.length || 0}
Completed items: ${agenda?.filter(a => a.status === 'completed').length || 0}
Decisions made: ${decisions?.length || 0}
Attendees: ${JSON.stringify(attendees?.map(a => ({ name: a.profiles?.full_name })))}

Return JSON:
{
  "hints": [
    {
      "hint_type": "time|participation|progress|decision",
      "hint_message": "actionable coaching message",
      "priority": 0-10
    }
  ]
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
          coaching = JSON.parse(text);
          console.log("Gemini coaching successful");
        } else {
          const errorText = await aiResponse.text();
          console.error("Gemini API error:", aiResponse.status, errorText);
        }
      } catch (e) {
        console.error("Gemini failed:", e);
      }
    }

    if (!coaching) {
      throw new Error("All AI providers failed");
    }

    // Save hints
    const hintsToInsert = coaching.hints.map((hint: any) => ({
      meeting_id,
      user_id,
      hint_type: hint.hint_type,
      hint_message: hint.hint_message,
      priority: hint.priority,
      expires_at: new Date(endTime.getTime() + 3600000).toISOString()
    }));

    await supabase.from("executive_coach_hints").insert(hintsToInsert);

    return new Response(
      JSON.stringify({ success: true, hints: hintsToInsert }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating coach hints:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
