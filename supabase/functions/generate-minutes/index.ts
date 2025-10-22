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

    // Create language-specific instructions with STRICT fidelity requirements
    const languageInstruction = detectedLang === 'am'
      ? `\n\n═══ CRITICAL AMHARIC WRITING REQUIREMENTS ═══

🚫 ABSOLUTE FIDELITY RULE - READ CAREFULLY:
• ONLY summarize information EXPLICITLY STATED in the transcript above
• DO NOT add information, assumptions, or general knowledge
• DO NOT make up decisions, action items, or discussions not in the transcript
• If the transcript is empty or unclear, state that clearly
• EVERY point in your summary MUST trace back to specific words in the transcript
• When in doubt, omit rather than fabricate

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
      ? `\n\n🚫 ABSOLUTE FIDELITY RULE:
ONLY summarize information EXPLICITLY in the transcript. DO NOT add assumptions or external information.

CRITICAL LANGUAGE REQUIREMENT - ARABIC:
Generate the minutes in ARABIC using Arabic script.
Never use Latin letters or romanization.`
      : `\n\n🚫 ABSOLUTE FIDELITY RULE:
ONLY summarize information EXPLICITLY stated in the transcript above.
DO NOT add information, assumptions, or content not in the transcript.

Generate the minutes in the SAME LANGUAGE as the transcript.
If the transcript is in Amharic (Ge'ez script), the minutes MUST be in Amharic.
Never romanize or transliterate non-Latin scripts.`;

// Generate minutes using selected AI provider
    const prompt = `🎯 YOUR MISSION: Generate accurate meeting minutes that reflect ONLY what was actually discussed.

⚠️ CRITICAL FIDELITY RULES - YOU MUST FOLLOW:
1. ONLY include information EXPLICITLY stated in the transcript below
2. DO NOT add assumptions, external knowledge, or fabricated content
3. DO NOT invent discussions, decisions, or action items not in the transcript
4. If information is missing or unclear, acknowledge it rather than making it up
5. Every statement in your summary must trace back to specific words in the transcript
6. When in doubt: OMIT rather than FABRICATE

📋 MEETING CONTEXT:
Meeting Title: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Duration (scheduled): ${Math.round(
      (new Date(meeting.end_time).getTime() -
        new Date(meeting.start_time).getTime()) /
         60000
    )} minutes
${recordingSeconds !== null ? `Recording Time: ${Math.floor(recordingSeconds / 60)}m ${recordingSeconds % 60}s` : ''}

📝 PLANNED AGENDA:
${agendaList || 'No agenda items'}

🗣️ ACTUAL TRANSCRIPT (YOUR ONLY SOURCE OF TRUTH):
${fullTranscript || 'No transcript available'}

✅ RECORDED DECISIONS:
${decisionsList || 'No decisions recorded'}

${noTranscript ? `⚠️ NOTE: Transcript not available. Generate a draft based ONLY on agenda and recorded decisions. Add a clear disclaimer that this is a draft pending transcript.` : ``}

📊 REQUIRED SECTIONS (only include if information exists in transcript):
1. የስብሰባ ማጠቃለያ (Executive Summary) - 2-3 sentences based ONLY on transcript
2. ዋና ዋና የውይይት ነጥቦች (Key Discussion Points) - ONLY topics actually discussed
3. የተወሰኑ ውሳኔዎች (Decisions Made) - ONLY decisions explicitly stated
4. የተግባር እቅዶች (Action Items) - ONLY actions explicitly mentioned
5. ቀጣይ እርምጃዎች (Next Steps) - ONLY if mentioned in transcript

${detectedLang === 'am' ? '✍️ CRITICAL: Use Ethiopian punctuation ። at the end of EVERY sentence. Use ፣ for commas. Use ፦ before lists. Write in formal Amharic using SOV structure.' : ''}

Format as a professional markdown document.${languageInstruction}`;

    let minutes = "";
    let providerError = "";
    let providerStatus: number | null = null;

    // Try OpenAI first (best for multilingual summaries)
    const openaiKey = preference?.openai_api_key || Deno.env.get("OPENAI_API_KEY");
    if (openaiKey && !minutes) {
      try {
        console.log("🤖 Using OpenAI GPT-5");
        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-5-2025-08-07",
              messages: [
                { 
                  role: "system", 
                  content: `You are a professional meeting minutes generator specializing in multilingual documentation, with expert-level proficiency in Amharic business writing.

🚫 CRITICAL FIDELITY REQUIREMENT:
Your PRIMARY obligation is ACCURACY and FIDELITY to source material. You MUST:
• ONLY include information EXPLICITLY stated in the provided transcript
• NEVER add assumptions, external knowledge, or fabricated content
• NEVER invent discussions, decisions, or action items not in the transcript
• If information is unclear or missing, acknowledge it honestly
• Every point in your summary must trace back to specific text in the transcript
• When in doubt: OMIT rather than FABRICATE

${detectedLang === 'am' ? `AMHARIC EXPERTISE:
• You are a master of formal Amharic (ኦፊሴላዊ አማርኛ) business writing
• You MUST use proper Ethiopian punctuation consistently: ። (full stop), ፣ (comma), ፤ (semicolon), ፦ (colon), ፥ (section separator)
• Every sentence MUST end with ።
• Use Subject-Object-Verb (SOV) word order
• Use professional honorifics and business terminology
• Write in Ge'ez script exclusively - NEVER use Latin script or romanization
• Maintain formal tone and proper grammatical structure
• BUT MOST IMPORTANTLY: Only summarize what was actually said in Amharic in the transcript` : 'Preserve the transcript language and script exactly. Never romanize or transliterate. Only summarize what is explicitly in the transcript.'}` 
                },
                { role: "user", content: prompt },
              ],
              max_completion_tokens: 2500,
            }),
          }
        );

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          minutes = openaiData.choices?.[0]?.message?.content || "";
          console.log("✅ Minutes generated with OpenAI GPT-5");
        } else {
          const statusCode = openaiResponse.status;
          const errorText = await openaiResponse.text();
          console.error(`OpenAI API error (${statusCode}):`, errorText);
          
          if (statusCode === 429) {
            providerStatus = 429;
            providerError = "OpenAI rate limit exceeded. Falling back to Gemini...";
          } else if (statusCode === 402) {
            providerStatus = 402;
            providerError = "OpenAI: Payment required. Falling back to Gemini...";
          } else {
            providerError = `OpenAI: ${errorText}`;
          }
        }
      } catch (e) {
        console.error("OpenAI provider failed:", e);
        providerError = `OpenAI: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }

    // Fallback to Gemini if OpenAI fails
    const geminiKey = preference?.gemini_api_key || Deno.env.get("GEMINI_API_KEY");
    if (geminiKey && !minutes) {
      try {
        console.log("🤖 Using Gemini 2.5 Flash (fallback)");
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: detectedLang === 'am' 
                        ? `You are a professional meeting minutes generator with expert-level proficiency in Amharic business writing.

🚫 ABSOLUTE RULE: You MUST ONLY summarize what is EXPLICITLY in the transcript. DO NOT hallucinate, assume, or add information not present.

Amharic Requirements:
• Use proper Ethiopian punctuation: ። (full stop), ፣ (comma), ፤ (semicolon), ፦ (colon)
• Every sentence MUST end with ።
• Use Subject-Object-Verb (SOV) word order
• Write in Ge'ez script exclusively - NEVER use Latin script
• Use formal business vocabulary

\n\n${prompt}`
                        : `You are a professional meeting minutes generator. 

🚫 ABSOLUTE RULE: You MUST ONLY summarize what is EXPLICITLY in the transcript. DO NOT hallucinate, assume, or add information not present.

Preserve the transcript language and script exactly.\n\n${prompt}`
                    }
                  ]
                }
              ],
              generationConfig: { 
                temperature: 0.7, 
                maxOutputTokens: 2500,
                topP: 0.95,
                topK: 40
              },
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          minutes = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log("✅ Minutes generated with Gemini 2.5 Flash");
        } else {
          const statusCode = geminiResponse.status;
          const errorText = await geminiResponse.text();
          console.error(`Gemini API error (${statusCode}):`, errorText);
          
          if (statusCode === 429) {
            providerStatus = 429;
            providerError = "Gemini rate limit exceeded.";
          } else if (statusCode === 402) {
            providerStatus = 402;
            providerError = "Gemini: Payment required.";
          } else {
            providerError = `Gemini: ${errorText}`;
          }
        }
      } catch (e) {
        console.error("Gemini provider failed:", e);
        providerError = `Gemini: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }
    if (!minutes) {
      // Build a more helpful error message
      // Build a more helpful error message
      let errMsg = "All AI providers failed. ";
      if (providerStatus === 429) {
        errMsg += "Rate limits exceeded. Please wait a few minutes and try again.";
      } else if (providerStatus === 402) {
        errMsg += "API credits exhausted. Please check your API key billing.";
      } else {
        errMsg += providerError || "Please check your API keys and try again.";
      }
      const errorStatusCode = providerStatus || 500;
      console.error("All AI providers failed:", errMsg);
      return new Response(
        JSON.stringify({ 
          error: errMsg
        }), 
        { 
          status: errorStatusCode, 
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
