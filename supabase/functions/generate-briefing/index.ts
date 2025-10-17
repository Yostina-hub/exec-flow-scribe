import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let prompt = '';
    let entityId = meetingId;
    let entityType = 'unknown';

    // Try to get meeting data first
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*, transcriptions(*), decisions(*), action_items(*), meeting_attendees(*, profiles(*))')
      .eq('id', meetingId)
      .single();

    if (meeting && !meetingError) {
      console.log('Generating briefing for meeting:', meeting.title);
      entityType = 'meeting';
      // Generate briefing document for meeting
      prompt = `Create an executive briefing document for this meeting:

Meeting: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Duration: ${Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / 60000)} minutes
Attendees: ${meeting.meeting_attendees?.length || 0} people

Transcript: ${meeting.transcriptions?.[0]?.content || 'No transcript available'}

Key Decisions:
${meeting.decisions?.map((d: any) => `- ${d.decision_text}`).join('\n') || 'None'}

Action Items:
${meeting.action_items?.map((a: any) => `- ${a.title} (${a.status})`).join('\n') || 'None'}

Create a professional briefing document with:
1. Executive Summary (2-3 sentences)
2. Key Highlights (most important points)
3. Decisions Made (with context)
4. Action Items (who, what, when)
5. Next Steps
6. Concerns/Risks (if any)

Format as JSON with sections: executive_summary (string), highlights (array), decisions (array), action_items (array), next_steps (array), concerns (array)`;
    } else {
      // Try to get source data (for notebook sources)
      console.log('Not a meeting, trying to fetch as notebook source:', meetingId);
      const { data: source, error: sourceError } = await supabase
        .from('notebook_sources')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (sourceError || !source) {
        console.error('Source fetch error:', sourceError);
        throw new Error('No meeting or source found with this ID');
      }

      console.log('Generating briefing for source:', source.title, 'type:', source.source_type);
      entityType = 'source';

      // Generate briefing document for source
      prompt = `Create an executive briefing document for this source:

Title: ${source.title}
Type: ${source.source_type}
Content: ${source.content || 'No content available'}

Create a professional briefing document with:
1. Executive Summary (2-3 sentences)
2. Key Highlights (most important points)
3. Main Topics/Themes
4. Important Details
5. Next Steps or Recommendations
6. Concerns/Risks (if any)

Format as JSON with sections: executive_summary (string), highlights (array), topics (array), details (array), next_steps (array), concerns (array)`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert at creating executive briefing documents. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const briefing = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Failed to parse response' };

    // Save to database (only if it's a meeting, not a source)
    let savedOutput = null;
    if (meeting) {
      const { data, error: saveError } = await supabase
        .from('studio_outputs')
        .insert({
          meeting_id: meetingId,
          output_type: 'briefing',
          content: briefing,
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving to studio_outputs:', saveError);
      } else {
        savedOutput = data;
      }
    }

    return new Response(JSON.stringify({ briefing, outputId: savedOutput?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-briefing:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
