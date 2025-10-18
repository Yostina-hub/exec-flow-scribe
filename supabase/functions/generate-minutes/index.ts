import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const recordingSeconds = typeof body.recordingSeconds === 'number' ? body.recordingSeconds : null;

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
    
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

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
      ? `\n\n═══ CRITICAL AMHARIC WRITING REQUIREMENTS ═══

LANGUAGE & SCRIPT:
• Write ENTIRELY in AMHARIC using Ge'ez script (ሀ ለ ሐ መ ሠ ረ ሰ ሸ ቀ በ ተ ቸ ኀ ነ ኘ አ ከ ኸ ወ ዐ ዘ ዠ የ ደ ጀ ገ ጠ ጨ ጰ ጸ ፀ ፈ ፐ)
• NEVER use Latin letters (a-z) or romanization
• ALL headings, titles, content MUST be Ge'ez script

ETHIOPIAN PUNCTUATION (MANDATORY):
• ። = Full stop (end of sentence) - USE CONSISTENTLY
• ፣ = Comma (separating items in lists)
• ፤ = Semicolon (separating related clauses)
• ፦ = Colon (before lists or explanations)
• ፥ = Section separator

SENTENCE STRUCTURE:
• Use Subject-Object-Verb (SOV) word order
• Start each sentence with proper context
• End EVERY sentence with ። 
• Separate items in lists with ፣
• Use ፦ before introducing lists or points

PROFESSIONAL VOCABULARY:
• Use formal business Amharic (ኦፊሴላዊ አማርኛ)
• Use proper honorifics: አቶ (Mr.), ወ/ሮ (Mrs.), ዶ/ር (Dr.), ኢንጅነር (Eng.)
• Use professional terms: ስብሰባ (meeting), ውሳኔ (decision), ተግባር (action), ድርጅት (organization)

FORMATTING:
• Use clear paragraph breaks (double line breaks)
• Format headings: ## የስብሰባ ማጠቃለያ
• Use bullet points: • or - for lists
• Maintain consistent verb tenses

Example heading structure:
## የስብሰባ ማጠቃለያ
## ዋና ዋና የውይይት ነጥቦች
## የተወሰኑ ውሳኔዎች
## የተግባር እቅዶች`
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
Duration (scheduled): ${Math.round(
      (new Date(meeting.end_time).getTime() -
        new Date(meeting.start_time).getTime()) /
         60000
    )} minutes
${recordingSeconds !== null ? `Recording Time: ${Math.floor(recordingSeconds / 60)}m ${recordingSeconds % 60}s` : ''}

Agenda Items:
${agendaList}

Full Transcript:
${fullTranscript}

Decisions Made:
${decisionsList}

${noTranscript ? `NOTE: Transcript not available. Generate a clear draft based on agenda, meeting metadata, and any decisions. Add a disclaimer at the top.` : ``}

Please generate comprehensive meeting minutes with these sections:
1. የስብሰባ ማጠቃለያ (Executive Summary) - 2-3 well-formed sentences
2. ዋና ዋና የውይይት ነጥቦች (Key Discussion Points) - organized by agenda item
3. የተወሰኑ ውሳኔዎች (Decisions Made) - clear, actionable decisions
4. የተግባር እቅዶች (Action Items) - with assigned responsibilities
5. ቀጣይ እርምጃዎች (Next Steps) - follow-up items

${detectedLang === 'am' ? 'CRITICAL: Use Ethiopian punctuation ። at the end of EVERY sentence. Use ፣ for commas. Use ፦ before lists.' : ''}

Format as a professional markdown document.${languageInstruction}`;

    let minutes = "";
    let providerError = "";

    // Try Lovable AI first (best for Amharic multilingual support)
    if (lovableApiKey && !minutes) {
      try {
        console.log("🤖 Using Lovable AI Gateway with gemini-2.5-pro (optimized for Amharic)");
        const lovableResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro", // Best for multilingual + complex reasoning
              messages: [
                { 
                  role: "system", 
                  content: `You are a professional meeting minutes generator specializing in multilingual documentation, with expert-level proficiency in Amharic business writing.

${detectedLang === 'am' ? `AMHARIC EXPERTISE:
• You are a master of formal Amharic (ኦፊሴላዊ አማርኛ) business writing
• You MUST use proper Ethiopian punctuation consistently: ። (full stop), ፣ (comma), ፤ (semicolon), ፦ (colon), ፥ (section separator)
• Every sentence MUST end with ።
• Use Subject-Object-Verb (SOV) word order
• Use professional honorifics and business terminology
• Write in Ge'ez script exclusively - NEVER use Latin script or romanization
• Maintain formal tone and proper grammatical structure` : 'Preserve the transcript language and script exactly. Never romanize or transliterate.'}` 
                },
                { role: "user", content: prompt },
              ],
            }),
          }
        );

        if (lovableResponse.ok) {
          const lovableData = await lovableResponse.json();
          minutes = lovableData.choices?.[0]?.message?.content || "";
          console.log("✅ Minutes generated with Lovable AI (gemini-2.5-pro)");
        } else {
          const statusCode = lovableResponse.status;
          const errorText = await lovableResponse.text();
          console.error(`Lovable AI error (${statusCode}):`, errorText);
          
          if (statusCode === 429) {
            providerError = "Rate limit exceeded. Please try again in a moment.";
          } else if (statusCode === 402) {
            providerError = "AI credits exhausted. Please add credits to continue.";
          } else {
            providerError = `Lovable AI: ${errorText}`;
          }
        }
      } catch (e) {
        console.error("Lovable AI provider failed:", e);
        providerError = `Lovable AI: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }

    // Fallback to OpenAI if available and Lovable AI failed
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey && !minutes) {
      try {
        console.log("🤖 Fallback to OpenAI API");
        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: `You are a professional meeting minutes generator specializing in multilingual documentation. 
${detectedLang === 'am' ? 'You are an expert in formal Amharic business writing. You MUST use proper Ethiopian punctuation (። ፣ ፤ ፦) consistently. End every sentence with ። Use formal vocabulary and proper SOV sentence structure. Never use Latin script or romanization.' : 'Preserve the transcript language and script exactly. Never romanize or transliterate.'}` },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 2000,
            }),
          }
        );

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          minutes = openaiData.choices?.[0]?.message?.content || "";
          console.log("✅ Minutes generated with OpenAI");
        } else {
          const error = await openaiResponse.text();
          console.error("OpenAI error:", error);
          providerError += (providerError ? "; " : "") + `OpenAI: ${error}`;
        }
      } catch (e) {
        console.error("OpenAI provider failed:", e);
        providerError += (providerError ? "; " : "") + `OpenAI: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }

    // Try Gemini as last resort
    if (!minutes && provider === "gemini") {
      try {
        const geminiKey = preference?.gemini_api_key || Deno.env.get("GEMINI_API_KEY");
        if (!geminiKey) throw new Error("Gemini API key not configured");

        console.log("🤖 Using Gemini API");
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
          console.log("✅ Minutes generated with Gemini");
        } else {
          const errorText = await geminiResponse.text();
          console.error("Gemini error:", errorText);
          providerError += (providerError ? "; " : "") + `Gemini: ${errorText}`;
        }
      } catch (e) {
        console.error("Gemini provider failed:", e);
        providerError += (providerError ? "; " : "") + `Gemini: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }

    if (!minutes) {
      console.error("All AI providers failed:", providerError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate minutes. " + (providerError || "Please try again later.")
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
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
