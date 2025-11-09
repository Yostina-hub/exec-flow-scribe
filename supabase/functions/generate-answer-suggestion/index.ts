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
    const { questionId, meetingId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the question
    const { data: question, error: questionError } = await supabase
      .from("meeting_questions")
      .select("question")
      .eq("id", questionId)
      .single();

    if (questionError) throw questionError;

    // Get meeting context
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("title, description, agenda_items(title, description)")
      .eq("id", meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Get recent transcriptions for context
    const { data: transcripts, error: transcriptsError } = await supabase
      .from("transcriptions")
      .select("content, speaker_id")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: false })
      .limit(20);

    if (transcriptsError) throw transcriptsError;

    // Get speaker names
    const speakerIds = [...new Set((transcripts || []).map(t => t.speaker_id).filter(Boolean))];
    let nameById = new Map<string, string>();
    
    if (speakerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", speakerIds as string[]);
      
      for (const p of profiles || []) {
        if (p && (p as any).id) {
          nameById.set((p as any).id, (p as any).full_name || "");
        }
      }
    }

    // Build context
    const agendaContext = meeting.agenda_items?.map((item: any) => 
      `- ${item.title}: ${item.description || ''}`
    ).join('\n') || 'No agenda available';

    const conversationContext = (transcripts || [])
      .map((t: any) => {
        const speakerName = (t.speaker_id && nameById.get(t.speaker_id)) || 'Speaker';
        return `${speakerName}: ${t.content}`;
      })
      .join('\n') || 'No conversation yet';

    // Generate AI suggestion
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
            content: `You are an intelligent meeting assistant. Generate a concise, accurate answer to participant questions based on meeting context and recent discussion. Keep answers professional, clear, and under 100 words. If the information isn't available in the context, suggest what information is needed.`
          },
          {
            role: "user",
            content: `Meeting: ${meeting.title}
Description: ${meeting.description || 'N/A'}

Agenda:
${agendaContext}

Recent Conversation:
${conversationContext}

Question from participant: ${question.question}

Provide a helpful answer based on the meeting context and discussion above.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits required, please add funds to your workspace." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }
      
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices[0]?.message?.content || "Unable to generate suggestion";
    const confidence = 0.85; // Base confidence level

    // Save suggestion to database
    const { error: updateError } = await supabase
      .from("meeting_questions")
      .update({
        ai_suggestion: suggestion,
        ai_suggestion_confidence: confidence
      })
      .eq("id", questionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        suggestion,
        confidence 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const err: any = error;
    const errorMessage = err?.message || err?.error || err?.details || "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});