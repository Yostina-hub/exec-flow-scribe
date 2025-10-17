import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const meetingId = body.meetingId || body.meeting_id;

    if (!meetingId) {
      console.error("Request body:", body);
      return new Response(
        JSON.stringify({ error: "Meeting ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("✨ Processing meeting:", meetingId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("✅ User authenticated:", user.id);

    // Get user's AI provider preference
    const { data: preference } = await supabase
      .from("ai_provider_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const provider = preference?.provider || "lovable_ai";
    console.log(`Using AI provider: ${provider}`);

    // Fetch meeting details
    console.log("📋 Fetching meeting details...");
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, agenda_items(*)")
      .eq("id", meetingId)
      .single();

    if (meetingError) {
      console.error("Meeting fetch error:", meetingError);
      return new Response(
        JSON.stringify({ error: "Meeting not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch transcriptions
    console.log("📝 Fetching transcriptions...");
    const { data: transcriptions, error: transcError } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });

    if (transcError) {
      console.error("Transcription fetch error:", transcError);
    }
    
    if (!transcriptions || transcriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcriptions found for this meeting. Please record the meeting first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch decisions
    const { data: decisions, error: decisionsError } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meetingId);

    if (decisionsError) {
      throw new Error("Failed to fetch decisions");
    }

    // Detect language from transcriptions
    const detectLanguage = (text: string): 'am' | 'ar' | 'en' | 'other' => {
      if (!text) return 'en';
      const ethiopicRegex = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;
      const arabicRegex = /[\u0600-\u06FF]/;
      
      if (ethiopicRegex.test(text)) return 'am';
      if (arabicRegex.test(text)) return 'ar';
      return 'en';
    };

    const detectedLang = transcriptions && transcriptions.length > 0
      ? detectLanguage(transcriptions.map(t => t.content).join(' ').substring(0, 500))
      : 'en';
    
    console.log(`📍 Detected meeting language: ${detectedLang}`);

    // Combine all context
    const fullTranscript = transcriptions
      ?.map((t) => `${t.speaker_name || "Speaker"}: ${t.content}`)
      .join("\n\n") || "";

    const agendaList = meeting.agenda_items
      ?.map((item: any) => `- ${item.title}`)
      .join("\n") || "";

    const decisionsList = decisions
      ?.map((d: any) => `- ${d.decision_text}`)
      .join("\n") || "";

    // Create language-specific instructions
    const languageInstruction = detectedLang === 'am'
      ? `\n\nCRITICAL LANGUAGE REQUIREMENT - AMHARIC:
You MUST generate the minutes in AMHARIC using Ge'ez script (ሀ ለ ሐ መ ሠ ረ ሰ ሸ ቀ በ ተ ቸ ኀ ነ ኘ አ ከ ኸ ወ ዐ ዘ ዠ የ ደ ጀ ገ ጠ ጨ ጰ ጸ ፀ ፈ ፐ).
NEVER use Latin letters (a-z) or romanization.
Use proper Amharic punctuation (።፣፤፥፦).
All headings, summaries, and content MUST be in Ge'ez script.
Example heading: "## ስብሰባ ማጠቃለያ" NOT "## Meeting Summary"`
      : detectedLang === 'ar'
      ? `\n\nCRITICAL LANGUAGE REQUIREMENT - ARABIC:
Generate the minutes in ARABIC using Arabic script.
Never use Latin letters or romanization.`
      : `\n\nGenerate the minutes in the SAME LANGUAGE as the transcript.
If the transcript is in Amharic (Ge'ez script), the minutes MUST be in Amharic.
Never romanize or transliterate non-Latin scripts.`;

    // Generate minutes using selected AI provider
    const prompt = `You are an executive assistant tasked with generating professional meeting minutes.

Meeting Title: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Duration: ${Math.round(
      (new Date(meeting.end_time).getTime() -
        new Date(meeting.start_time).getTime()) /
        60000
    )} minutes

Agenda Items:
${agendaList}

Full Transcript:
${fullTranscript}

Decisions Made:
${decisionsList}

Please generate:
1. A concise executive summary (2-3 sentences)
2. Key discussion points organized by agenda item
3. Action items with assigned responsibilities (extract from transcript)
4. Next steps and follow-up items

Format the output as a professional meeting minutes document in markdown format.${languageInstruction}`;

    let minutes = "";

    if (provider === "gemini") {
      // Use custom Gemini API key
      const geminiKey = preference?.gemini_api_key || Deno.env.get("GEMINI_API_KEY");
      if (!geminiKey) {
        throw new Error("Gemini API key not configured");
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            },
          }),
        }
      );

      if (!geminiResponse.ok) {
        const error = await geminiResponse.text();
        console.error("Gemini generation error:", error);
        throw new Error("Failed to generate minutes with Gemini");
      }

      const geminiData = await geminiResponse.json();
      minutes = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // Use Lovable AI (default)
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        }
      );

      if (!aiResponse.ok) {
        const error = await aiResponse.text();
        console.error("AI generation error:", error);
        throw new Error("Failed to generate minutes with Lovable AI");
      }

      const aiData = await aiResponse.json();
      minutes = aiData.choices[0]?.message?.content || "";
    }

    // Update meeting with generated minutes
    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        minutes_url: minutes,
        status: "completed",
      })
      .eq("id", meetingId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw new Error("Failed to save minutes");
    }

    return new Response(
      JSON.stringify({
        success: true,
        minutes,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-minutes:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
