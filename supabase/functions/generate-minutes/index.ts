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
    // Try primary table
    let transcriptions: any[] = [];
    let tr1 = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });

    if (tr1.error) {
      console.error("Transcription fetch error (transcriptions):", tr1.error);
    }
    transcriptions = tr1.data || [];

    // Fallback to alternate table name used elsewhere in app
    if (!transcriptions.length) {
      console.log("🔎 No rows in 'transcriptions'. Trying 'transcription_segments'...");
      const tr2 = await supabase
        .from("transcription_segments")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });
      if (tr2.error) {
        console.warn("Transcription fetch error (transcription_segments):", tr2.error);
      }
      if (tr2.data?.length) {
        // Normalize shape -> { content, timestamp, speaker_name }
        transcriptions = tr2.data
          .map((r: any) => ({
            content: r.content || r.text || "",
            timestamp: r.created_at || r.timestamp || new Date().toISOString(),
            speaker_name: r.speaker || r.speaker_name || null,
          }))
          .filter((t: any) => (t.content || '').trim());
      }
    }

    const noTranscript = transcriptions.length === 0;


    // Fetch decisions
    const { data: decisions, error: decisionsError } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meetingId);

    if (decisionsError) {
      throw new Error("Failed to fetch decisions");
    }

    // Combine and analyze transcript to detect dominant language (favor Amharic when mixed)
    const fullTranscript = transcriptions
      ?.map((t) => `${t.speaker_name || "Speaker"}: ${t.content}`)
      .join("\n\n") || "";

    const flatText = transcriptions?.map(t => t.content).join(' ') || '';
    const ETH = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g; // Ge'ez/Ethiopic
    const ARA = /[\u0600-\u06FF]/g; // Arabic
    const LAT = /[A-Za-z]/g; // Latin letters

    const etCount = (flatText.match(ETH) || []).length;
    const arCount = (flatText.match(ARA) || []).length;
    const laCount = (flatText.match(LAT) || []).length;
    const total = etCount + arCount + laCount;

    let detectedLang: 'am' | 'ar' | 'en' = 'en';
    if (total > 0) {
      const etRatio = etCount / total;
      const arRatio = arCount / total;
      const laRatio = laCount / total;
      // Prefer Amharic if present significantly (>=30%) or clearly dominant
      if ((etRatio >= 0.3 && etRatio >= arRatio) || (etCount >= arCount && etCount >= laCount && etCount >= 10)) {
        detectedLang = 'am';
      } else if (arRatio > etRatio && arRatio >= 0.3) {
        detectedLang = 'ar';
      } else {
        detectedLang = 'en';
      }
      console.log(`📊 Script counts -> Ge'ez:${etCount} Arabic:${arCount} Latin:${laCount} | ratios -> am:${etRatio.toFixed(2)} ar:${arRatio.toFixed(2)} en:${laRatio.toFixed(2)}`);
    }
    console.log(`📍 Detected meeting language: ${detectedLang}`);

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
    
    ${noTranscript ? `NOTE: Transcript not available. Generate a clear draft based on agenda, meeting metadata, and any decisions. Add a disclaimer at the top: "Note: Transcript not available — draft minutes."` : ``}
    
    Please generate:
    1. A concise executive summary (2-3 sentences)
    2. Key discussion points organized by agenda item
    3. Action items with assigned responsibilities (extract from transcript where available)
    4. Next steps and follow-up items
    
    Format the output as a professional meeting minutes document in markdown format.${languageInstruction}`;

    let minutes = "";

    // Try provider-specific first (Gemini), then fallback to Lovable AI
    if (provider === "gemini") {
      try {
        const geminiKey = preference?.gemini_api_key || Deno.env.get("GEMINI_API_KEY");
        if (!geminiKey) throw new Error("Gemini API key not configured");

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          minutes = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          const error = await geminiResponse.text();
          console.error("Gemini generation error:", error);
        }
      } catch (e) {
        console.error("Gemini provider failed:", e);
      }
    }

    if (!minutes) {
      // Lovable AI fallback/default
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
              { role: "system", content: "You are a professional minutes generator. Preserve the transcript language and script. For Amharic, use Ge'ez (no Latin)." },
              { role: "user", content: prompt },
            ]
          }),
        }
      );

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add AI credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const error = await aiResponse.text();
        console.error("Lovable AI generation error:", error);
        throw new Error("Failed to generate minutes");
      }

      const aiData = await aiResponse.json();
      minutes = aiData.choices?.[0]?.message?.content || "";
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
