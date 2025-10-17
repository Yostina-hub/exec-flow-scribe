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

    // Get meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*, transcriptions(*), decisions(*), action_items(*)')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Generate timeline using AI
    const prompt = `Based on this meeting content, create a chronological timeline of key events and discussions:

Meeting: ${meeting.title}
Start Time: ${new Date(meeting.start_time).toLocaleString()}

Transcript: ${meeting.transcriptions?.[0]?.content || 'No transcript available'}

Decisions Made:
${meeting.decisions?.map((d: any) => `- ${d.decision_text} (at ${new Date(d.timestamp).toLocaleTimeString()})`).join('\n') || 'None'}

Action Items Created:
${meeting.action_items?.map((a: any) => `- ${a.title}`).join('\n') || 'None'}

Create a detailed timeline with:
- Meeting start
- Key discussion topics (with estimated time)
- Important points raised
- Decisions made (with time if available)
- Action items assigned
- Meeting conclusion

Format as JSON: { events: [{ time: string (HH:MM format or "Start"/"End"), title: string, description: string, type: "start"|"discussion"|"decision"|"action"|"end" }] }
Order events chronologically.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert at creating meeting timelines. Always respond with valid JSON.' },
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
    const timeline = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Failed to parse response' };

    // Save to database
    const { data: savedOutput, error: saveError } = await supabase
      .from('studio_outputs')
      .insert({
        meeting_id: meetingId,
        output_type: 'timeline',
        content: timeline,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ timeline, outputId: savedOutput.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-timeline:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
