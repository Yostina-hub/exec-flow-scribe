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

    // Fetch polls and poll responses
    console.log("🗳️ Fetching polls and responses...");
    const { data: polls, error: pollsError } = await supabase
      .from("meeting_polls")
      .select("*, poll_responses(*)")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true });

    if (pollsError) {
      console.warn("Poll fetch warning:", pollsError);
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

    // Format polls data
    const pollsList = polls?.map((p: any) => {
      const optionsArray = Array.isArray(p.options) ? p.options : [];
      const responses = p.poll_responses || [];
      const totalVotes = responses.length;
      
      // Count votes for each option
      const voteCounts: { [key: string]: number } = {};
      responses.forEach((r: any) => {
        const selectedOpts = Array.isArray(r.selected_options) ? r.selected_options : [];
        selectedOpts.forEach((opt: string) => {
          voteCounts[opt] = (voteCounts[opt] || 0) + 1;
        });
      });
      
      const resultsText = optionsArray.map((opt: string) => {
        const count = voteCounts[opt] || 0;
        const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";
        return `  • ${opt}: ${count} votes (${percentage}%)`;
      }).join("\n");
      
      return `Poll: ${p.question}\nType: ${p.poll_type}\nStatus: ${p.status}\nTotal Votes: ${totalVotes}\nResults:\n${resultsText}`;
    }).join("\n\n") || "";

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

// Generate minutes using selected AI provider with enhanced natural language instructions
    const prompt = `🎯 YOUR MISSION: Create comprehensive, natural-sounding meeting minutes that capture EVERY detail and nuance from the discussion.

⚠️ CRITICAL PRIORITY ORDER - CAPTURE IN THIS SEQUENCE:
1. **MEETING OPENER'S INTRODUCTION** - The very first statements by who opened/introduced the meeting, their welcome remarks, and the purpose they stated
2. **MAIN AGENDA TOPICS** - Each major topic discussed in the order it was presented
3. **DISCUSSION DETAILS** - ALL points raised, questions asked, answers given, viewpoints expressed
4. **DECISIONS & OUTCOMES** - Every decision made and conclusion reached
5. **ACTION ITEMS** - All tasks assigned with complete context
6. **CLOSING REMARKS** - Final statements and next steps

⚠️ COMPLETENESS & ACCURACY RULES:
1. **START with meeting opener** - Capture who opened the meeting and their initial remarks word-for-word importance
2. Capture ALL information from the transcript - don't skip any details, however minor
3. Include ALL speaker contributions, questions, answers, and clarifications
4. Preserve the natural flow and sequence of the conversation
5. Include context, reasoning, and background mentioned by speakers
6. Capture emotional tone, emphasis, and speaker intentions when relevant
7. Record ALL numbers, dates, names, and specific details mentioned
8. Include tangential discussions if they add context
9. Write in a natural, conversational but professional tone
10. NEVER add information not in the transcript - only expand on what's there
11. **Give special attention to opening and main discussion points** - these should be most comprehensive

✍️ WRITING STYLE REQUIREMENTS:
• Write as a skilled human note-taker would - natural, fluid, complete
• Use varied sentence structures to avoid robotic repetition
• Connect ideas smoothly with transitions
• Include speaker perspectives and reasoning processes
• Capture the "story" of the meeting, not just bullet points
• Make it engaging and readable while maintaining professionalism
• Vary paragraph lengths for natural rhythm
• Use specific quotes when they capture important points
• **Dedicate substantial detail to opening statements and core discussion topics**

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

🗣️ COMPLETE TRANSCRIPT - READ EVERY WORD CAREFULLY:
${fullTranscript || 'No transcript available'}

✅ RECORDED DECISIONS:
${decisionsList || 'No decisions recorded'}

🗳️ POLLS & VOTING RESULTS:
${pollsList || 'No polls conducted'}

${noTranscript ? `⚠️ NOTE: Transcript not available. Generate a draft based ONLY on agenda and recorded decisions. Add a clear disclaimer that this is a draft pending transcript.` : ``}

📊 REQUIRED SECTIONS (be thorough and complete):
1. **የስብሰባ መግቢያ** (Meeting Opening) - WHO opened the meeting, their introduction, welcome remarks, and stated purpose (MUST be comprehensive - this sets the stage)
2. የስብሰባ ማጠቃለያ (Executive Summary) - Comprehensive overview capturing all major points, context, and outcomes (4-6 detailed sentences minimum)
3. **ዋና ዋና የውይይት ነጥቦች** (Key Discussion Points) - DETAILED coverage of ALL topics discussed in order presented, including:
   • Who introduced each topic and why
   • Context provided by speakers
   • Different viewpoints and perspectives expressed
   • Questions raised and answers given
   • Explanations and reasoning shared
   • Specific examples or data mentioned
   (This should be the LONGEST, MOST DETAILED section)
4. የተወሰኑ ውሳኔዎች (Decisions Made) - ALL decisions with full context about how they were reached
5. 🗳️ የምርጫ ውጤቶች (Poll Results) - Complete poll information with context
6. የተግባር እቅዶች (Action Items) - ALL actions mentioned with full details
7. ቀጣይ እርምጃዎች (Next Steps) - Future plans and follow-ups discussed
8. ተጨማሪ ሐሳቦች (Additional Notes) - Other relevant points, context, or observations

${detectedLang === 'am' ? '✍️ CRITICAL AMHARIC REQUIREMENTS: Use Ethiopian punctuation ። at the end of EVERY sentence. Use ፣ for commas within sentences. Use ፦ before introducing lists or elaborations. Use ፤ for separating related clauses. Write in natural, flowing formal Amharic using proper SOV structure. Make it read like a skilled Amharic writer documented the meeting - natural, complete, and professional.' : ''}

📝 FINAL REMINDERS:
• Be thorough - err on the side of including more detail rather than less
• Make it readable and engaging - avoid dry bullet points
• Connect ideas naturally - show how topics relate to each other
• Capture the complete picture - context, decisions, reasoning, outcomes
• Write as if you were actually in the meeting taking comprehensive notes

Format as a professional markdown document with clear sections and natural prose.${languageInstruction}`;

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
              model: "gpt-5-2025-08-07", // High-quality model for comprehensive minutes
              messages: [
                { 
                  role: "system", 
                  content: `You are an expert meeting minutes specialist who creates comprehensive, natural-sounding documentation. You have mastered the art of capturing every detail while maintaining engaging, professional prose.

🎯 YOUR APPROACH:
• Act as a skilled human note-taker who attended the meeting
• Capture EVERY detail, nuance, and context from the discussion
• Write in a natural, flowing style that engages readers
• Include complete information - don't summarize or abbreviate excessively
• Show the progression of ideas and how decisions were reached
• Preserve speaker intentions, reasoning, and important quotes
• Connect topics naturally to show the meeting's narrative flow
• Make minutes thorough yet readable - like skilled human documentation

✅ QUALITY STANDARDS:
• Completeness: Include all discussions, questions, answers, and details
• Accuracy: Only information from the transcript - no additions or assumptions
• Natural flow: Varied sentences, smooth transitions, engaging prose
• Context: Background, reasoning, and full picture of discussions
• Professional yet conversational: Formal but not robotic
• Detailed: Comprehensive coverage without missing minor but relevant points

${detectedLang === 'am' ? `🇪🇹 AMHARIC MASTERY:
You are a master of formal Ethiopian Amharic (ኦፊሴላዊ አማርኛ) business writing with these non-negotiable requirements:
• Write in natural, flowing Ge'ez script exclusively - NEVER use Latin letters
• Use proper Ethiopian punctuation consistently: ። (sentence end), ፣ (comma), ፤ (semicolon), ፦ (colon before lists/elaborations), ፥ (section separator)
• Every sentence MUST end with ።
• Use Subject-Object-Verb (SOV) word order naturally
• Employ professional honorifics and business terminology
• Write with the skill and naturalness of an educated Ethiopian professional
• Vary sentence structure and length for natural rhythm
• Connect ideas smoothly with appropriate Amharic transitions
• Make it indistinguishable from high-quality human-written Amharic documentation
• BUT CRITICALLY: Only document what was actually discussed in the transcript` : 'Preserve the transcript language and script exactly. Write with native fluency in that language. Never romanize or transliterate. Only document what is explicitly in the transcript.'}` 
                },
                { role: "user", content: prompt },
              ],
              max_completion_tokens: 5000, // Increased for comprehensive minutes with all details
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
                        ? `You are an expert meeting documentation specialist with masterful command of formal Ethiopian Amharic writing. You create comprehensive, natural-sounding minutes that capture every detail while reading like skilled human documentation.

✍️ YOUR WRITING APPROACH:
• Write as a highly skilled Ethiopian professional who attended the meeting
• Capture ALL details comprehensively without missing anything
• Write in natural, flowing Amharic that engages readers
• Use varied sentence structures and natural rhythm
• Connect ideas smoothly with appropriate transitions
• Include complete context and reasoning behind discussions
• Make it indistinguishable from expert human-written Amharic documentation

🇪🇹 ETHIOPIAN AMHARIC REQUIREMENTS (NON-NEGOTIABLE):
• Write ENTIRELY in Ge'ez script (ሀ-ፐ) - NEVER use Latin letters (a-z)
• Use proper Ethiopian punctuation consistently: ። (sentence end), ፣ (comma), ፤ (semicolon), ፦ (colon), ፥ (section separator)
• Every sentence MUST end with ።
• Use Subject-Object-Verb (SOV) word order naturally
• Write in formal business Amharic with professional vocabulary
• Employ appropriate honorifics and business terminology
• Make prose natural and engaging, not robotic or mechanical

✅ CRITICAL: Only document what is EXPLICITLY in the transcript. Be thorough but accurate - never add information not present in the discussion.

\n\n${prompt}`
                        : `You are an expert meeting documentation specialist who creates comprehensive, natural-sounding minutes that capture every detail while reading like skilled human documentation.

Write thoroughly, naturally, and professionally. Only document what is EXPLICITLY in the transcript - be complete but accurate.

Preserve the transcript language and script exactly.\n\n${prompt}`
                    }
                  ]
                }
              ],
              generationConfig: { 
                temperature: 0.8, // Slightly higher for more natural, varied language
                maxOutputTokens: 6000, // Increased significantly for comprehensive, detailed coverage
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

    // Final fallback to Lovable AI (if available)
    if (lovableApiKey && !minutes) {
      try {
        console.log("🤖 Using Lovable AI (final fallback)");
        const lovableResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro", // Upgraded to Pro for best quality comprehensive minutes
              messages: [
                { 
                  role: "system", 
                  content: `You are an expert meeting minutes specialist who creates comprehensive, natural-sounding documentation. You have mastered the art of capturing every detail while maintaining engaging, professional prose.

🎯 YOUR APPROACH:
• Act as a skilled human note-taker who attended the meeting
• Capture EVERY detail, nuance, and context from the discussion
• Write in a natural, flowing style that engages readers
• Include complete information - don't summarize or abbreviate excessively
• Show the progression of ideas and how decisions were reached
• Preserve speaker intentions, reasoning, and important quotes
• Connect topics naturally to show the meeting's narrative flow
• Make minutes thorough yet readable - like skilled human documentation

✅ QUALITY STANDARDS:
• Completeness: Include all discussions, questions, answers, and details
• Accuracy: Only information from the transcript - no additions or assumptions
• Natural flow: Varied sentences, smooth transitions, engaging prose
• Context: Background, reasoning, and full picture of discussions
• Professional yet conversational: Formal but not robotic
• Detailed: Comprehensive coverage without missing minor but relevant points

${detectedLang === 'am' ? `🇪🇹 AMHARIC MASTERY:
You are a master of formal Ethiopian Amharic (ኦፊሴላዊ አማርኛ) business writing with these non-negotiable requirements:
• Write in natural, flowing Ge'ez script exclusively - NEVER use Latin letters
• Use proper Ethiopian punctuation consistently: ። (sentence end), ፣ (comma), ፤ (semicolon), ፦ (colon before lists/elaborations), ፥ (section separator)
• Every sentence MUST end with ።
• Use Subject-Object-Verb (SOV) word order naturally
• Employ professional honorifics and business terminology
• Write with the skill and naturalness of an educated Ethiopian professional
• Vary sentence structure and length for natural rhythm
• Connect ideas smoothly with appropriate Amharic transitions
• Make it indistinguishable from high-quality human-written Amharic documentation
• BUT CRITICALLY: Only document what was actually discussed in the transcript` : 'Preserve the transcript language and script exactly. Write with native fluency in that language. Never romanize or transliterate. Only document what is explicitly in the transcript.'}` 
                },
                { role: "user", content: prompt },
              ],
            }),
          }
        );

        if (lovableResponse.ok) {
          const lovableData = await lovableResponse.json();
          minutes = lovableData.choices?.[0]?.message?.content || "";
          console.log("✅ Minutes generated with Lovable AI");
        } else {
          const statusCode = lovableResponse.status;
          const errorText = await lovableResponse.text();
          console.error(`Lovable AI error (${statusCode}):`, errorText);
          
          if (statusCode === 429) {
            providerStatus = 429;
            providerError = "Lovable AI rate limit exceeded.";
          } else if (statusCode === 402) {
            providerStatus = 402;
            providerError = "Lovable AI: Payment required - please add credits to your workspace.";
          } else {
            providerError = `Lovable AI: ${errorText}`;
          }
        }
      } catch (e) {
        console.error("Lovable AI provider failed:", e);
        providerError += ` | Lovable AI: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }

    // If all providers failed, return helpful error
    if (!minutes) {
      let errMsg = "Unable to generate minutes. ";
      
      if (providerStatus === 429) {
        errMsg = "⏳ Rate Limit Exceeded\n\nAll AI providers are temporarily rate limited. This is usually temporary.\n\n📋 What to do:\n• Wait 2-3 minutes and try again\n• If this persists, check your API provider dashboards\n• Contact support if the issue continues\n\nTip: Consider adding multiple AI provider keys in Settings to have automatic fallbacks.";
      } else if (providerStatus === 402) {
        errMsg = "💳 Payment Required\n\nYour AI provider credits have been exhausted.\n\n📋 What to do:\n1. Go to Settings → Workspace → Usage\n2. Add credits to your Lovable AI workspace\n3. Or add your own OpenAI/Gemini API keys in Settings\n\nOnce done, try generating minutes again.";
      } else {
        errMsg += providerError || "Please check your AI provider configuration in Settings.";
      }
      
      const errorStatusCode = providerStatus || 500;
      console.error("All AI providers failed:", errMsg);
      // Add Retry-After header guidance on rate limit
      const respHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (errorStatusCode === 429) respHeaders["Retry-After"] = "60";
      
      return new Response(
        JSON.stringify({ 
          error: errMsg,
          technical_details: providerError,
          status: errorStatusCode
        }), 
        { 
          status: errorStatusCode, 
          headers: respHeaders 
        }
      );
    }

    // Persist generated minutes into minutes_versions and update meeting status
    // Compute next version number from minutes_versions
    const { data: lastVersionRow, error: versionError } = await supabase
      .from('minutes_versions')
      .select('version_number')
      .eq('meeting_id', meetingId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      console.warn('Version fetch error:', versionError);
    }

    let nextVersion = (lastVersionRow?.version_number || 0) + 1;

    // Insert minutes record with simple retry to avoid race on unique (meeting_id, version_number)
    let inserted = false;
    let attempts = 0;
    // Try with current user first; on RLS failure, fall back to meeting owner
    let createdByCandidate: string = user.id;
    while (!inserted && attempts < 6) {
      const { error: insertError } = await supabase
        .from('minutes_versions')
        .insert({
          meeting_id: meetingId,
          version_number: nextVersion,
          content: minutes,
          created_by: createdByCandidate,
          is_ratified: false,
        });

      if (!insertError) {
        inserted = true;
        break;
      }

      // Extract detailed error information
      const message = (insertError as any)?.message || '';
      const details = (insertError as any)?.details || '';
      const hint = (insertError as any)?.hint || '';
      const code = (insertError as any)?.code || '';
      const errStr = JSON.stringify({ message, details, hint, code });
      
      console.error(`❌ Minutes insert error (attempt ${attempts + 1}, version ${nextVersion}):`, errStr);
      console.error(`📋 Full error object:`, JSON.stringify(insertError));
      console.error(`👤 Attempting with user: ${createdByCandidate}`);
      console.error(`🆔 Meeting ID: ${meetingId}`);
      console.error(`📊 Meeting creator: ${(meeting as any)?.created_by}`);

      const msgLower = message.toLowerCase();
      const detailsLower = details.toLowerCase();
      const isUniqueViolation =
        (typeof code === 'string' && code.includes('23505')) ||
        msgLower.includes('duplicate key value') ||
        detailsLower.includes('duplicate key value') ||
        msgLower.includes('(meeting_id, version_number)');

      // Handle RLS violation by retrying with meeting owner as creator
      const isRlsViolation =
        msgLower.includes('row-level security') ||
        msgLower.includes('rls') ||
        msgLower.includes('policy') ||
        detailsLower.includes('row-level security');

      // Check for foreign key violations
      const isFkViolation =
        (typeof code === 'string' && code.includes('23503')) ||
        msgLower.includes('foreign key') ||
        msgLower.includes('violates foreign key constraint') ||
        detailsLower.includes('foreign key');

      if (isUniqueViolation) {
        console.warn(`⚠️ Unique constraint violation, incrementing version to ${nextVersion + 1}`);
        nextVersion += 1;
        attempts += 1;
        await new Promise((r) => setTimeout(r, 120));
        continue;
      }

      if (isRlsViolation && createdByCandidate !== (meeting as any)?.created_by) {
        console.warn(`⚠️ RLS violation, retrying with meeting creator: ${(meeting as any)?.created_by}`);
        createdByCandidate = (meeting as any).created_by;
        attempts += 1;
        await new Promise((r) => setTimeout(r, 80));
        continue;
      }

      // Surface detailed error to client for debugging
      let errorDetail = `Database insert failed: ${message}`;
      if (details) errorDetail += `\nDetails: ${details}`;
      if (hint) errorDetail += `\nHint: ${hint}`;
      if (code) errorDetail += `\nCode: ${code}`;
      
      if (isFkViolation) {
        errorDetail += `\n\n🔍 Foreign key constraint violation detected. Check that:
- User ${createdByCandidate} exists in auth.users
- Meeting ${meetingId} exists in meetings table
- All referenced IDs are valid`;
      } else if (isRlsViolation) {
        errorDetail += `\n\n🔒 RLS policy violation. User ${createdByCandidate} cannot insert minutes for meeting ${meetingId}.`;
      }
      
      console.error(`💥 Unrecoverable error:`, errorDetail);
      throw new Error(errorDetail);
    }

    if (!inserted) {
      throw new Error('Failed to save minutes');
    }

    // Optionally update meeting status to completed (column exists in schema)
    const { error: meetingStatusError } = await supabase
      .from('meetings')
      .update({ status: 'completed' })
      .eq('id', meetingId);

    if (meetingStatusError) {
      console.warn('Meeting status update warning:', meetingStatusError);
      // Do not throw; minutes saved successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        minutes,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
