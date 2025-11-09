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
    const { meetingId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get meeting transcriptions first (no joins to avoid FK requirements)
    const { data: transcriptions, error: transcriptError } = await supabase
      .from("transcriptions")
      .select("content, speaker_id")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });

    if (transcriptError) throw transcriptError;

    if (!transcriptions || transcriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcriptions found for this meeting" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch speaker names separately from profiles
    const speakerIds = Array.from(
      new Set((transcriptions as any[]).map(t => t.speaker_id).filter((id: string | null) => !!id))
    );

    let nameById = new Map<string, string>();
    if (speakerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", speakerIds as string[]);
      if (profilesError) throw profilesError;
      for (const p of profiles || []) {
        if (p && (p as any).id) nameById.set((p as any).id, (p as any).full_name || "");
      }
    }

    // Build conversation context
    const context = (transcriptions as any[])
      .map((t) => {
        const speakerName = (t.speaker_id && nameById.get(t.speaker_id)) || 'Unknown Speaker';
        return `${speakerName}: ${t.content}`;
      })
      .join("\n");

    // Call Lovable AI to generate questions
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
            content: `You are an intelligent meeting assistant. Generate 3-5 thoughtful, open-ended questions based on the meeting discussion. Questions should:
- Clarify key points or decisions
- Explore implications of what was discussed
- Request missing information or details
- Prompt for consensus or next steps
Format: Return ONLY a JSON array of question strings, nothing else.`,
          },
          {
            role: "user",
            content: `Generate intelligent questions from this meeting discussion:\n\n${context}`,
          },
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
    const content = aiData.choices[0]?.message?.content || "[]";
    
    // Parse questions
    let questions: string[];
    try {
      questions = JSON.parse(content);
    } catch {
      // Fallback: extract questions from markdown list
      questions = content
        .split("\n")
        .filter((line: string) => line.trim().startsWith("-") || line.trim().match(/^\d+\./))
        .map((line: string) => line.replace(/^[-\d.]\s*/, "").trim());
    }

    // Store questions in database
    const questionRecords = questions.map((q) => ({
      meeting_id: meetingId,
      question: q,
      generated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("meeting_questions")
      .insert(questionRecords);

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const err: any = error;
    const errorMessage = err?.message || err?.error || err?.details || "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
