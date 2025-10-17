import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, query } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Invalid authorization");
    }

    // Fetch meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, agenda_items(*)")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error("Meeting not found");
    }

    // Fetch all relevant context
    const [transcriptions, decisions, actions, chatHistory] = await Promise.all([
      supabase.from("transcriptions")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("timestamp", { ascending: true }),
      supabase.from("decisions")
        .select("*")
        .eq("meeting_id", meetingId),
      supabase.from("action_items")
        .select("*")
        .eq("meeting_id", meetingId),
      supabase.from("meeting_chat_messages")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true })
        .limit(10) // Last 10 messages for context
    ]);

    // Build context
    const fullTranscript = transcriptions.data
      ?.map((t: any) => `${t.speaker_name || "Speaker"}: ${t.content}`)
      .join("\n\n") || "";

    const decisionsList = decisions.data
      ?.map((d: any) => `- ${d.decision_text}`)
      .join("\n") || "No decisions recorded";

    const actionsList = actions.data
      ?.map((a: any) => `- ${a.title} (${a.status})`)
      .join("\n") || "No action items";

    const agendaList = meeting.agenda_items
      ?.map((item: any) => `- ${item.title}`)
      .join("\n") || "No agenda items";

    // Build conversation history
    const conversationHistory = chatHistory.data?.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })) || [];

    const contextPrompt = `You are an AI assistant helping analyze an executive meeting. Answer questions based on the meeting data provided.

Meeting: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}

Agenda:
${agendaList}

Decisions Made:
${decisionsList}

Action Items:
${actionsList}

Full Transcript:
${fullTranscript.substring(0, 10000)}

User Question: ${query}

Provide a clear, detailed answer based on the meeting data. Include specific references to decisions, action items, or quotes from the transcript when relevant.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...conversationHistory.map(msg => ({
              role: msg.role === "user" ? "user" : "model",
              parts: [{ text: msg.content }]
            })),
            {
              role: "user",
              parts: [{ text: contextPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I couldn't generate a response for your question.";

    // Save chat messages
    await supabase.from("meeting_chat_messages").insert([
      { meeting_id: meetingId, user_id: user.id, role: "user", content: query },
      { meeting_id: meetingId, user_id: user.id, role: "assistant", content: answer }
    ]);

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in meeting-chat:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        answer: "An error occurred while processing your question."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});