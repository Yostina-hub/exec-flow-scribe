import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, timeWindow = 300 } = await req.json(); // Default 5 minutes

    if (!meetingId) {
      throw new Error('Missing required field: meetingId');
    }

    console.log('Generating live summary for meeting:', meetingId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent transcriptions (last N seconds)
    const windowStart = new Date(Date.now() - timeWindow * 1000).toISOString();
    
    const { data: transcriptions, error: transError } = await supabase
      .from('transcriptions')
      .select('id, content, speaker_name, timestamp, created_at')
      .eq('meeting_id', meetingId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true });

    if (transError) throw transError;

    if (!transcriptions || transcriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          summary: 'No recent activity to summarize.',
          transcriptionCount: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get emotional analysis for the same period
    const transcriptionIds = transcriptions.map(t => t.id);
    const { data: emotions } = await supabase
      .from('emotional_analysis')
      .select('primary_emotion, sentiment, energy_level, speaker_name')
      .in('transcription_id', transcriptionIds);

    // Prepare context for AI
    const conversationText = transcriptions
      .map(t => `${t.speaker_name || 'Unknown'}: ${t.content}`)
      .join('\n');

    const emotionSummary = emotions
      ? `Emotional context: ${emotions.map(e => `${e.speaker_name}: ${e.primary_emotion} (${e.sentiment}, ${e.energy_level} energy)`).join(', ')}`
      : '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate AI summary
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI meeting analyst. Generate concise, actionable live summaries of meeting segments.

Focus on:
- Key topics discussed
- Tone shifts (e.g., "shifted from neutral to concerned")
- Important decisions or agreements
- Action items mentioned
- Emotional dynamics

Keep it brief (2-3 sentences) and actionable.`
          },
          {
            role: 'user',
            content: `Summarize this ${Math.floor(timeWindow / 60)}-minute meeting segment:\n\n${conversationText}\n\n${emotionSummary}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`AI summary failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    // Detect tone shifts
    const toneShift = emotions && emotions.length > 2
      ? detectToneShift(emotions)
      : null;

    // Store summary
    const { data: savedSummary, error: saveError } = await supabase
      .from('meeting_summaries')
      .insert({
        meeting_id: meetingId,
        summary_type: toneShift ? 'tone_shift' : 'live',
        content: summary,
        start_time: transcriptions[0].created_at,
        end_time: transcriptions[transcriptions.length - 1].created_at,
        metadata: {
          transcription_count: transcriptions.length,
          tone_shift: toneShift,
          emotions: emotions?.map(e => e.primary_emotion) || [],
        },
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
    }

    console.log('Live summary generated:', savedSummary?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        toneShift,
        transcriptionCount: transcriptions.length,
        timeRange: {
          start: transcriptions[0].created_at,
          end: transcriptions[transcriptions.length - 1].created_at,
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in generate-live-summary:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate summary',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to detect tone shifts
function detectToneShift(emotions: any[]): string | null {
  if (emotions.length < 3) return null;

  const firstHalf = emotions.slice(0, Math.floor(emotions.length / 2));
  const secondHalf = emotions.slice(Math.floor(emotions.length / 2));

  const firstDominant = getMostFrequent(firstHalf.map(e => e.primary_emotion));
  const secondDominant = getMostFrequent(secondHalf.map(e => e.primary_emotion));

  if (firstDominant !== secondDominant) {
    return `Tone shifted from ${firstDominant} to ${secondDominant}`;
  }

  return null;
}

function getMostFrequent(arr: string[]): string {
  const frequency: Record<string, number> = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  return Object.keys(frequency).reduce((a, b) => 
    frequency[a] > frequency[b] ? a : b
  );
}
