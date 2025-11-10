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

    // Helper function to update progress
    const updateProgress = async (
      status: string,
      percentage: number,
      step?: string,
      estimatedSeconds?: number
    ) => {
      await supabase
        .from('minute_generation_progress')
        .upsert({
          meeting_id: meetingId,
          status,
          progress_percentage: percentage,
          current_step: step || null,
          estimated_completion_seconds: estimatedSeconds || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_id'
        });
      console.log(`Progress: ${percentage}% - ${status} - ${step || ''}`);
    };

    // Initialize progress tracking
    await updateProgress('initializing', 0, 'Starting minute generation...', 60);

    // Get user's AI provider preference & fetch meeting data in parallel
    console.log("📋 Fetching data in parallel...");
    await updateProgress('fetching_data', 10, 'Fetching meeting data and transcriptions...', 50);
    const [
      { data: preference },
      { data: meeting, error: meetingError },
      tr1,
      { data: decisions },
      { data: polls },
      { data: attendees },
      { data: collaborativeNotes },
      { data: actionItems }
    ] = await Promise.all([
      supabase.from("ai_provider_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("meetings").select("*, agenda_items(*)").eq("id", meetingId).maybeSingle(),
      supabase.from("transcriptions").select("*").eq("meeting_id", meetingId).order("timestamp", { ascending: true }),
      supabase.from("decisions").select("*").eq("meeting_id", meetingId),
      supabase.from("meeting_polls").select("*, poll_responses(*)").eq("meeting_id", meetingId).order("created_at", { ascending: true }),
      supabase.from("meeting_attendees").select("*, profiles(full_name, email)").eq("meeting_id", meetingId),
      supabase.from("meeting_notes").select("*, profiles(full_name)").eq("meeting_id", meetingId).order("created_at", { ascending: true }),
      supabase.from("action_items").select("*").eq("meeting_id", meetingId)
    ]);

    const provider = preference?.provider || "lovable_ai";
    console.log(`Using AI provider: ${provider}`);
    
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (meetingError || !meeting) {
      console.error("Meeting fetch error:", meetingError);
      return new Response(
        JSON.stringify({ error: meetingError ? "Error fetching meeting data" : "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process transcriptions with fallback
    let transcriptions: any[] = tr1.data || [];

    if (!transcriptions.length) {
      console.log("🔎 Trying 'transcription_segments'...");
      const tr2 = await supabase
        .from("transcription_segments")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });
      
      if (tr2.data?.length) {
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

    // Check if we have pre-generated chunks to speed up the process
    const { data: existingChunks } = await supabase
      .from('minute_chunks')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('chunk_number', { ascending: true });

    let useChunks = false;
    if (existingChunks && existingChunks.length > 0) {
      console.log(`✨ Found ${existingChunks.length} pre-generated chunks, will use them for faster generation`);
      useChunks = true;
      await updateProgress('analyzing', 30, `Using ${existingChunks.length} pre-analyzed segments...`, 20);
    } else {
      console.log('📝 No pre-generated chunks found, will process full transcription');
      await updateProgress('analyzing', 30, 'Analyzing full transcription...', 40);
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

    // Default to Amharic for Ethiopian context
    let detectedLang: 'am' | 'ar' | 'en' = 'am';
    if (total > 0) {
      const etRatio = etCount / total;
      const arRatio = arCount / total;
      const laRatio = laCount / total;
      // Prefer Amharic by default, only switch if clearly another language
      if (arRatio > 0.6 && arRatio > etRatio) {
        detectedLang = 'ar';
      } else if (laRatio > 0.7 && laCount > arCount && laCount > etCount) {
        detectedLang = 'en';
      } else {
        // Default to Amharic for Ethiopian organizational context
        detectedLang = 'am';
      }
      console.log(`📊 Script counts -> Ge'ez:${etCount} Arabic:${arCount} Latin:${laCount} | ratios -> am:${etRatio.toFixed(2)} ar:${arRatio.toFixed(2)} en:${laRatio.toFixed(2)}`);
    }
    console.log(`📍 Language set to: ${detectedLang} (Defaults to Amharic for Ethiopian context)`);

    const agendaList = meeting.agenda_items
      ?.map((item: any, idx: number) => {
        const presenter = item.presenter_id || 'Not assigned';
        const duration = item.duration_minutes ? `${item.duration_minutes} min` : 'TBD';
        const status = item.status || 'pending';
        return `${idx + 1}. ${item.title}\n   Presenter ID: ${presenter} | Duration: ${duration} | Status: ${status}\n   ${item.description || 'No description'}`;
      })
      .join("\n\n") || "";

    const decisionsList = decisions
      ?.map((d: any, idx: number) => {
        const timestamp = d.created_at ? new Date(d.created_at).toLocaleString() : '';
        return `${idx + 1}. ${d.decision_text}\n   Made by: ${d.decision_maker || 'Unknown'} | Time: ${timestamp}\n   Impact: ${d.impact_level || 'Not specified'}`;
      })
      .join("\n\n") || "";

    // Format attendees data
    const attendeesList = attendees?.map((a: any) => {
      const name = a.profiles?.full_name || a.profiles?.email || 'Unknown';
      const status = a.attended ? '✅ Attended' : a.response_status === 'accepted' ? '📅 Confirmed' : '❓ Pending';
      const role = a.role || 'Participant';
      return `• ${name} - ${role} (${status})`;
    }).join("\n") || "";

    // Format collaborative notes
    const collaborativeNotesList = collaborativeNotes?.map((n: any) => {
      const author = n.profiles?.full_name || 'Anonymous';
      const type = n.note_type || 'general';
      const pinned = n.is_pinned ? '📌 ' : '';
      const tags = Array.isArray(n.tags) && n.tags.length > 0 ? ` [${n.tags.join(', ')}]` : '';
      return `${pinned}${type.toUpperCase()}: ${n.content}\n   By: ${author}${tags}`;
    }).join("\n\n") || "";

    // Format action items
    const actionItemsList = actionItems?.map((a: any, idx: number) => {
      const assignee = a.assigned_to || 'Unassigned';
      const creator = a.created_by || 'Unknown';
      const due = a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date';
      const priority = a.priority || 'medium';
      const status = a.status || 'pending';
      const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
      return `${idx + 1}. ${priorityEmoji} ${a.title}\n   ${a.description || 'No description'}\n   Assigned to ID: ${assignee} | Created by ID: ${creator}\n   Due: ${due} | Priority: ${priority} | Status: ${status}`;
    }).join("\n\n") || "";

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
• WHEN ENGLISH TECHNICAL TERMS appear: provide Amharic translation/explanation in parentheses. Example: "ማናጀመንት (አስተዳደር)" or explain the concept in Amharic
• For names, titles, or specific terms, you may keep the original in Latin script only if transliteration would lose meaning, but ALWAYS provide Amharic context

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
    let prompt: string;
    
    if (useChunks && existingChunks && existingChunks.length > 0) {
      // Build prompt from pre-analyzed chunks (faster)
      const chunkSummaries = existingChunks.map(chunk => {
        const startMin = Math.floor(chunk.start_time / 60);
        const endMin = Math.floor(chunk.end_time / 60);
        return `
## Segment ${chunk.chunk_number + 1} (Minutes ${startMin}-${endMin})
${chunk.summary}

**Key Points:**
${chunk.key_points?.map((p: string) => `• ${p}`).join('\n') || 'None'}

**Decisions:**
${chunk.decisions?.map((d: string) => `• ${d}`).join('\n') || 'None'}

**Action Items:**
${chunk.action_items?.map((a: string) => `• ${a}`).join('\n') || 'None'}`;
      }).join('\n\n');

      prompt = `🎯 YOUR MISSION: Synthesize pre-analyzed meeting segments into comprehensive, cohesive meeting minutes.

You are provided with ${existingChunks.length} pre-analyzed segments from a meeting. Each segment has already been summarized with key points, decisions, and action items extracted. Your job is to combine these into a single, flowing, professional meeting minutes document.

📋 MEETING CONTEXT:
Meeting Title: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Time: ${new Date(meeting.start_time).toLocaleTimeString()} - ${new Date(meeting.end_time).toLocaleTimeString()}
Duration: ${Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / 60000)} minutes
${recordingSeconds !== null ? `Actual Recording: ${Math.floor(recordingSeconds / 60)}m ${recordingSeconds % 60}s` : ''}

📝 PLANNED AGENDA:
${agendaList || 'No agenda items'}

👥 PARTICIPANTS:
${attendeesList || 'No participants recorded'}

📊 PRE-ANALYZED SEGMENTS:
${chunkSummaries}

✅ RECORDED DECISIONS:
${decisionsList || 'No additional decisions recorded'}

✅ ACTION ITEMS:
${actionItemsList || 'No additional action items'}

📝 COLLABORATIVE NOTES:
${collaborativeNotesList || 'No collaborative notes'}

🗳️ POLLS:
${pollsList || 'No polls conducted'}

⚠️ YOUR TASK - SYNTHESIS INSTRUCTIONS:
1. **Create a unified narrative** - Combine the segment summaries into a flowing, chronological story
2. **Remove redundancy** - If points appear in multiple segments, consolidate them
3. **Maintain completeness** - Don't lose any important information from the segments
4. **Add context** - Show how segments connect and flow into each other
5. **Organize logically** - Group related points even if they're from different segments
6. **Professional tone** - Write as a polished, professional document

📊 REQUIRED SECTIONS:
1. **Meeting Information Table** (markdown table format)
2. **Executive Summary** (4-6 sentences synthesizing all segments)
3. **Discussion Details** (organized by theme, drawing from all segments)
4. **Decisions Made** (consolidated from all segments + recorded decisions)
5. **Action Items** (consolidated from all segments + recorded items)
6. **Next Steps** (if discussed)

${languageInstruction}

Format as professional markdown with clear headers, proper punctuation, and natural prose.`;

      await updateProgress('generating', 60, 'Synthesizing pre-analyzed segments...', 15);
    } else {
      // Original full prompt for complete transcription processing
      prompt = `🎯 YOUR MISSION: Create highly professional, comprehensive executive-level meeting minutes that exemplify organizational excellence and document every critical detail with precision and clarity.

⚠️ CRITICAL PRIORITY ORDER - DOCUMENT WITH EXECUTIVE PRECISION:
1. **EXECUTIVE SUMMARY** - A powerful, concise overview capturing the meeting's strategic importance and key outcomes
2. **MEETING OPENER'S INTRODUCTION** - The official opening statements, introductions, and meeting objectives as stated by the chairperson
3. **STRATEGIC AGENDA TOPICS** - Each agenda item presented with its business context and organizational impact
4. **COMPREHENSIVE DISCUSSION** - All substantive points, strategic questions, expert responses, and stakeholder perspectives
5. **EXECUTIVE DECISIONS & RESOLUTIONS** - Every decision with full rationale, impact assessment, and implementation implications
6. **ACTION ITEMS WITH ACCOUNTABILITY** - All assignments with clear ownership, deadlines, and expected deliverables
7. **OFFICIAL CLOSING** - Final directives, next meeting schedule, and concluding remarks

⚠️ EXECUTIVE DOCUMENTATION STANDARDS - COMPLETENESS & PRECISION:
1. **EXECUTIVE OPENING** - Document the meeting chairperson's opening with verbatim accuracy and appropriate gravitas
2. **COMPLETE CAPTURE** - Record every substantive point, ensuring nothing of organizational importance is omitted
3. **STAKEHOLDER CONTRIBUTIONS** - Document all participant inputs, questions, expert opinions, and decision-making dialogue
4. **LOGICAL FLOW** - Maintain chronological and thematic coherence, showing how discussions progressed toward conclusions
5. **CONTEXTUAL DEPTH** - Include strategic context, business rationale, and organizational implications throughout
6. **PROFESSIONAL TONE** - Capture the appropriate level of formality and authority expected in executive documentation
7. **FACTUAL PRECISION** - Record all figures, dates, names, titles, and specific commitments with absolute accuracy
8. **COMPREHENSIVE SCOPE** - Include supporting discussions that provide context for major decisions
9. **EXECUTIVE POLISH** - Write with the sophistication and clarity expected in board-level documentation
10. **FIDELITY RULE** - Document only what was explicitly stated - no assumptions, inferences, or external information
11. **PRIORITIZE SUBSTANCE** - Give proportionate detail to opening remarks, strategic discussions, and executive decisions

✍️ PROFESSIONAL WRITING STANDARDS FOR EXECUTIVE DOCUMENTATION:
• Employ executive-level business writing: authoritative, polished, sophisticated yet accessible
• Use varied, professional sentence structures that demonstrate linguistic competence
• Connect concepts with strategic transitions showing cause-effect and decision-flow relationships
• Articulate stakeholder perspectives with appropriate attribution and context
• Document the strategic narrative - the "why" and "how" behind decisions, not merely the "what"
• Maintain consistent professional tone befitting organizational importance
• Balance comprehensive detail with readability through effective paragraph structuring
• Use direct quotations strategically to capture critical statements or commitments
• **Demonstrate organizational sophistication** - this document represents institutional memory and professional standards

📝 EXECUTIVE-LEVEL DESCRIPTIVE STANDARDS:
• Employ sophisticated, professional language appropriate for executive and board-level documentation
• Articulate decision rationale with full strategic context - the WHY and WHAT combined
• Document complete reasoning chains: what led to discussions, how options were evaluated, why conclusions were reached
• Characterize discussion dynamics professionally (collaborative consensus-building, robust debate, unanimous support, etc.)
• Trace idea development showing how concepts evolved through structured dialogue
• Use executive-appropriate transitional language demonstrating logical progression and strategic thinking
• Contextualize references with sufficient background for future institutional reference
• Structure each section as a complete strategic narrative with clear beginning (context), middle (discussion), and conclusion (resolution/outcome)
• Maintain the gravitas and formality appropriate for official organizational records

✅ PUNCTUATION & PROFESSIONAL FORMATTING STANDARDS:
• Employ flawless punctuation with executive-level precision throughout all documentation
• Conclude every statement with proper terminal punctuation (. ! ?) - no exceptions
• Use commas strategically to enhance clarity and guide professional reading comprehension
• Deploy colons (:) to formally introduce enumerations or elaborate on strategic points
• Apply semicolons (;) to connect substantively related clauses with sophistication
• Frame direct quotations appropriately with quotation marks to preserve verbatim accuracy
• Utilize em dashes (—) judiciously for emphasis, clarification, or parenthetical remarks
• Structure lists with consistent, professional formatting using proper enumeration
• Insert clear paragraph breaks to delineate distinct topics and maintain visual organization
• Apply markdown headers (##) systematically to create professional document hierarchy
• **For Amharic/Ethiopian Documentation: Apply Ethiopian punctuation consistently - ። (period) ፣ (comma) ፤ (semicolon) ፦ (colon) ፥ (section marker) - with the same precision expected in international business standards**

📋 MEETING CONTEXT:
Meeting Title: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Time: ${new Date(meeting.start_time).toLocaleTimeString()} - ${new Date(meeting.end_time).toLocaleTimeString()}
Duration (scheduled): ${Math.round(
      (new Date(meeting.end_time).getTime() -
        new Date(meeting.start_time).getTime()) /
         60000
    )} minutes
${recordingSeconds !== null ? `Actual Recording Duration: ${Math.floor(recordingSeconds / 60)}m ${recordingSeconds % 60}s` : ''}
Location: ${meeting.location || 'Not specified'}

📝 PLANNED AGENDA:
${agendaList || 'No agenda items'}

🗣️ COMPLETE TRANSCRIPT - READ EVERY WORD CAREFULLY:
${fullTranscript || 'No transcript available'}

✅ RECORDED DECISIONS:
${decisionsList || 'No decisions recorded'}

🗳️ POLLS & VOTING RESULTS:
${pollsList || 'No polls conducted'}

👥 MEETING PARTICIPANTS:
${attendeesList || 'No participants recorded'}

📝 COLLABORATIVE NOTES & INSIGHTS:
${collaborativeNotesList || 'No collaborative notes'}

✅ ACTION ITEMS & TASKS:
${actionItemsList || 'No action items assigned'}

${noTranscript ? `⚠️ NOTE: Transcript not available. Generate a draft based ONLY on agenda and recorded decisions. Add a clear disclaimer that this is a draft pending transcript.` : ``}

⚠️ CRITICAL FORMATTING RULES - TABLES:
• Use PROPER MARKDOWN TABLE SYNTAX for all structured/tabular data
• Format tables correctly with pipes and alignment:
  | Column 1 | Column 2 | Column 3 |
  |----------|----------|----------|
  | Data 1   | Data 2   | Data 3   |
• NEVER use plain text with dashes (---) and spaces for tables
• Use tables for:
  - Meeting Information section (first section)
  - Attendees/Participants lists with roles
  - Agenda items with status/duration/presenter
  - Decision tracking with details
  - Action items with assignments/due dates
• Ensure proper alignment and spacing in tables

📊 REQUIRED SECTIONS (be thorough and complete):

🚨 CRITICAL RULE FOR EMPTY SECTIONS:
• If a section has NO content from the transcript (e.g., no decisions made, no polls conducted, no action items), DO NOT include that section at all
• NEVER write placeholder text like "በዚህ ስብስብ ላይ ምንም ዓይነት..." or "No decisions were made"
• NEVER include empty section headers followed by placeholder text
• SKIP the section entirely if there's nothing to document
• DO NOT add standalone punctuation marks (፦ or :) without content following them

0. **የስብሰባ መረጃ** (Meeting Information) - MUST be formatted as a markdown table at the very top:
   Example:
   | Field | Details |
   |-------|---------|
   | የስብሰባ ርዕስ (Title) | [Title] |
   | ቀን (Date) | [Date] |
   | ሰዓት (Time) | [Start] - [End] |
   | ቦታ (Location) | [Location] |
   | ተሳታፊዎች (Participants) | [List] |
1. **የስብሰባ መግቢያ** (Meeting Opening) - WHO opened the meeting, their introduction, welcome remarks, and stated purpose (MUST be comprehensive - this sets the stage)
2. የስብሰባ ማጠቃለያ (Executive Summary) - Comprehensive overview capturing all major points, context, and outcomes (4-6 detailed sentences minimum)
3. **የአጀንዳ ግምገማ** (Agenda Review) - Detailed summary of each agenda item:
   • What was planned for each agenda item
   • Who presented each topic
   • What was actually covered
   • Any deviations from the planned agenda
4. **ዋና ዋና የውይይት ነጥቦች** (Key Discussion Points) - DETAILED coverage of ALL topics discussed in order presented, including:
   • Who introduced each topic and why
   • Context provided by speakers
   • Different viewpoints and perspectives expressed
   • Questions raised and answers given
   • Explanations and reasoning shared
   • Specific examples or data mentioned
   • Reference collaborative notes where relevant
   (This should be the LONGEST, MOST DETAILED section)
5. **የተወሰኑ ውሳኔዎች** (Decisions Made) - ONLY include if decisions were actually made:
   • Full context about how they were reached
   • Who made the decision
   • When it was made
   • Impact level and implications
   ⚠️ If no decisions: SKIP this section entirely
6. 🗳️ **የምርጫ ውጤቶች** (Poll Results) - ONLY include if polls were conducted:
   • Question asked and context
   • All options and vote counts
   • Analysis of results
   • How results influenced decisions
   ⚠️ If no polls: SKIP this section entirely
7. 📝 **የጋራ ማስታወሻዎች** (Collaborative Notes & Insights) - ONLY include if notes exist:
   • Important observations shared during the meeting
   • Questions raised
   • Ideas contributed
   • Concerns noted
   Group by type (general, question, idea, concern)
   ⚠️ If no collaborative notes: SKIP this section entirely
8. **የተግባር እቅዶች** (Action Items) - ONLY include if action items were assigned:
   • Complete task description
   • Assignee and creator
   • Due date and priority
   • Current status
   • Context of why the task is needed
   ⚠️ If no action items: SKIP this section entirely
9. ቀጣይ እርምጃዎች (Next Steps) - ONLY include if future plans were discussed
10. የማጠቃለያ ተጨማሪ ሐሳቦች (Closing & Additional Notes) - Other relevant points, context, or observations

${detectedLang === 'am' ? `✍️ CRITICAL AMHARIC REQUIREMENTS:
• Use Ethiopian punctuation ። at the end of EVERY sentence without exception
• Use ፣ for commas within sentences to separate items and clauses
• Use ፦ before introducing lists, explanations, or elaborations
• Use ፤ for separating closely related clauses
• Use ፥ as section dividers between major topics
• Write in natural, flowing formal Amharic using proper SOV (Subject-Object-Verb) structure
• Use descriptive adjectives and adverbs to enrich the narrative
• Employ professional vocabulary and proper honorifics
• Create well-structured paragraphs with clear topic sentences
• Make it read like an educated Ethiopian professional documented the meeting - natural, complete, descriptive, and expertly punctuated` : `✍️ ENGLISH/OTHER LANGUAGE REQUIREMENTS:
• Use proper English punctuation: periods (.), commas (,), colons (:), semicolons (;)
• End every sentence with appropriate punctuation
• Use commas to improve readability and separate clauses
• Create well-structured paragraphs with clear flow
• Use professional vocabulary while remaining accessible
• Make it read like a skilled professional documented the meeting`}

📝 EXECUTIVE DOCUMENTATION EXCELLENCE - NON-NEGOTIABLE STANDARDS:
• **Comprehensive yet Organized** - Capture complete substantive content while maintaining executive-level structural clarity
• **Professionally Engaging** - Employ sophisticated narrative prose rather than simplistic bullet points; demonstrate linguistic competence
• **Strategic Coherence** - Articulate logical connections between topics showing strategic thinking and organizational flow
• **Impeccable Presentation** - Maintain flawless punctuation, grammar, and formatting as befits official institutional records
• **Analytical Depth** - Document the complete strategic picture: rationale, context, decision process, implications, and actionable outcomes
• **Contextual Sophistication** - Explain underlying reasoning, strategic considerations, and organizational impact
• **Professional Authority** - Write with the gravitas and polish expected of executive-level business documentation
• **Linguistic Excellence** - Demonstrate mastery of professional business language with varied, sophisticated sentence structures
• **Visual Organization** - Structure content professionally using appropriate headers, logical paragraphs, and strategic white space
• **Institutional Quality** - This document represents organizational standards and will serve as official institutional memory

Format as a professional markdown document with:
- Clear section headers (##)
- Well-structured paragraphs (not walls of text or excessive bullets)
- Proper punctuation throughout
- Natural prose that flows smoothly
- Descriptive language that provides rich detail${languageInstruction}`;
    }

    let minutes = "";
    let providerError = "";
    let providerStatus: number | null = null;

    await updateProgress('generating', 50, 'Generating minutes with AI...', 30);

    // Try Gemini API first (primary as requested)
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiKey && !minutes) {
      try {
        console.log("🤖 Using Gemini API (gemini-2.5-flash) - Primary Provider");
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are an expert meeting minutes specialist. Create comprehensive, natural documentation capturing every detail.

${detectedLang === 'am' ? `🇪🇹 AMHARIC REQUIREMENTS:
• Write entirely in Ge'ez script - NEVER use Latin letters
• Use Ethiopian punctuation: ። (end), ፣ (comma), ፦ (colon), ፤ (semicolon)
• Every sentence MUST end with ።
• Use SOV word order and formal business Amharic
• Write naturally like an educated Ethiopian professional` : 'Write in the transcript language. Never romanize or transliterate.'}

CRITICAL: Only document what is EXPLICITLY in the transcript - no assumptions.

${prompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8192,
              }
            }),
          }
        );

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          minutes = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          console.log("✅ Minutes generated with Gemini API (Primary)");
          await updateProgress('generating', 80, 'AI generation complete, preparing document...', 10);
        } else {
          const statusCode = geminiResponse.status;
          const errorText = await geminiResponse.text();
          console.error(`Gemini API error (${statusCode}):`, errorText);
          
          if (statusCode === 429) {
            providerStatus = 429;
            providerError = "Gemini API rate limit exceeded. Trying fallback...";
          } else {
            providerError = `Gemini API: ${errorText}`;
          }
        }
      } catch (e) {
        console.error("Gemini API provider failed:", e);
        providerError = `Gemini API: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }

    // Try Lovable AI as fallback (OpenAI-compatible format)
    if (lovableApiKey && !minutes) {
      try {
        console.log("🤖 Using Lovable AI (google/gemini-2.5-flash) as fallback");
        const lovableResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
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
              max_tokens: 10000,
              temperature: 0.3,
            }),
          }
        );

        if (lovableResponse.ok) {
          const lovableData = await lovableResponse.json();
          minutes = lovableData.choices?.[0]?.message?.content || "";
          console.log("✅ Minutes generated with Lovable AI (Fallback)");
          await updateProgress('generating', 80, 'AI generation complete, preparing document...', 10);
        } else {
          const statusCode = lovableResponse.status;
          const errorText = await lovableResponse.text();
          console.error(`Lovable AI error (${statusCode}):`, errorText);
          
          if (statusCode === 429) {
            providerStatus = 429;
            providerError = "Lovable AI rate limit exceeded. Trying OpenAI...";
          } else if (statusCode === 402) {
            providerStatus = 402;
            providerError = "Lovable AI: Payment required. Trying OpenAI...";
          } else {
            providerError = `Lovable AI: ${errorText}`;
          }
        }
      } catch (e) {
        console.error("Lovable AI provider failed:", e);
        providerError = `Lovable AI: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }

    // Try OpenAI as fallback
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
              max_completion_tokens: 10000, // Increased for comprehensive minutes with all details
            }),
          }
        );

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          minutes = openaiData.choices?.[0]?.message?.content || "";
          console.log("✅ Minutes generated with OpenAI GPT-5");
          await updateProgress('generating', 80, 'AI generation complete, preparing document...', 10);
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
    await updateProgress('finalizing', 90, 'Saving meeting minutes...', 5);
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

    // Mark as completed
    await updateProgress('completed', 100, 'Minutes generated successfully!', 0);

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
    
    // Update progress with error
    try {
      const body = await req.json();
      const meetingId = body.meetingId || body.meeting_id;
      if (meetingId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase
            .from('minute_generation_progress')
            .upsert({
              meeting_id: meetingId,
              status: 'failed',
              progress_percentage: 0,
              error_message: error instanceof Error ? error.message : "Unknown error",
              completed_at: new Date().toISOString()
            }, {
              onConflict: 'meeting_id'
            });
        }
      }
    } catch (e) {
      console.error("Failed to update error progress:", e);
    }
    
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
