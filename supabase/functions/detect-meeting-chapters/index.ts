import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transcription {
  id: string;
  content: string;
  timestamp: string;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { meetingId, recentTranscriptions } = await req.json();

    if (!meetingId || !recentTranscriptions || recentTranscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing meetingId or transcriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[detect-chapters] Processing ${recentTranscriptions.length} transcriptions for meeting ${meetingId}`);

    // Get existing chapters to avoid duplicates
    const { data: existingChapters } = await supabase
      .from('meeting_chapters')
      .select('timestamp, title')
      .eq('meeting_id', meetingId)
      .order('timestamp', { ascending: false })
      .limit(5);

    // Analyze transcription content for chapter detection
    const transcriptText = recentTranscriptions
      .map((t: Transcription) => t.content)
      .join(' ')
      .toLowerCase();

    const lastChapterTime = existingChapters?.[0]?.timestamp || '00:00:00';
    const currentTime = recentTranscriptions[recentTranscriptions.length - 1]?.timestamp || '00:00:00';

    // Simple keyword-based chapter detection (can be enhanced with AI)
    const detectedChapter = detectChapterFromContent(transcriptText, currentTime, lastChapterTime);

    if (detectedChapter && shouldCreateNewChapter(detectedChapter, existingChapters || [])) {
      console.log(`[detect-chapters] Creating new chapter: ${detectedChapter.title} at ${detectedChapter.timestamp}`);
      
      const { data: newChapter, error: insertError } = await supabase
        .from('meeting_chapters')
        .insert({
          meeting_id: meetingId,
          title: detectedChapter.title,
          timestamp: detectedChapter.timestamp,
          type: detectedChapter.type,
          start_transcription_id: recentTranscriptions[0].id,
          confidence_score: detectedChapter.confidence
        })
        .select()
        .single();

      if (insertError) {
        console.error('[detect-chapters] Error inserting chapter:', insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, chapter: newChapter }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, chapter: null, message: 'No new chapter detected' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[detect-chapters] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function detectChapterFromContent(text: string, currentTime: string, lastChapterTime: string) {
  // Keywords for different chapter types
  const introKeywords = ['welcome', 'introduction', 'hello everyone', 'let\'s begin', 'start meeting', 'good morning', 'good afternoon'];
  const discussionKeywords = ['discuss', 'talk about', 'regarding', 'concerning', 'let\'s review', 'budget', 'project', 'strategy'];
  const decisionKeywords = ['decide', 'decision', 'approve', 'agreed', 'consensus', 'vote', 'conclude that'];
  const actionKeywords = ['action item', 'task', 'assign', 'responsibility', 'next step', 'follow up', 'deadline'];
  const conclusionKeywords = ['wrap up', 'summarize', 'in conclusion', 'to conclude', 'final thoughts', 'that\'s all'];

  // Check for chapter indicators
  if (introKeywords.some(kw => text.includes(kw))) {
    return {
      title: 'Introductions',
      timestamp: currentTime,
      type: 'intro',
      confidence: 0.9
    };
  }

  if (decisionKeywords.some(kw => text.includes(kw))) {
    return {
      title: 'Key Decision',
      timestamp: currentTime,
      type: 'decision',
      confidence: 0.85
    };
  }

  if (actionKeywords.some(kw => text.includes(kw))) {
    return {
      title: 'Action Items',
      timestamp: currentTime,
      type: 'action',
      confidence: 0.85
    };
  }

  if (conclusionKeywords.some(kw => text.includes(kw))) {
    return {
      title: 'Conclusion',
      timestamp: currentTime,
      type: 'conclusion',
      confidence: 0.9
    };
  }

  if (discussionKeywords.some(kw => text.includes(kw))) {
    // Extract topic if possible
    const topic = extractTopicFromText(text);
    return {
      title: topic || 'Discussion',
      timestamp: currentTime,
      type: 'discussion',
      confidence: 0.75
    };
  }

  return null;
}

function extractTopicFromText(text: string): string | null {
  // Simple extraction - can be enhanced with NLP
  const budgetMatch = text.match(/budget|financial|cost/i);
  if (budgetMatch) return 'Budget Discussion';

  const projectMatch = text.match(/project|initiative|program/i);
  if (projectMatch) return 'Project Review';

  const strategyMatch = text.match(/strategy|plan|roadmap/i);
  if (strategyMatch) return 'Strategy Planning';

  return null;
}

function shouldCreateNewChapter(newChapter: any, existingChapters: any[]): boolean {
  // Don't create if we just created one with same title
  if (existingChapters.length > 0) {
    const lastChapter = existingChapters[0];
    if (lastChapter.title === newChapter.title) {
      return false;
    }
  }

  // Minimum confidence threshold
  return newChapter.confidence >= 0.7;
}
