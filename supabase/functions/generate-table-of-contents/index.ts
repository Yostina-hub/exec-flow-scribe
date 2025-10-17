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
      .select('*, transcriptions(*), agenda_items(*), decisions(*), action_items(*)')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Generate table of contents using AI
    const prompt = `Based on this meeting content, create a structured table of contents:

Meeting: ${meeting.title}
Description: ${meeting.description || 'N/A'}

Agenda Items:
${meeting.agenda_items?.map((a: any) => `- ${a.title}: ${a.description || ''}`).join('\n') || 'None'}

Transcript: ${meeting.transcriptions?.[0]?.content || 'No transcript available'}

Decisions: ${meeting.decisions?.length || 0}
Action Items: ${meeting.action_items?.length || 0}

Create a hierarchical table of contents with:
- Main sections (level 1)
- Subsections (level 2)
- Key points under each subsection (level 3)

Format as JSON: { 
  sections: [{ 
    title: string, 
    level: 1|2|3, 
    page_number: string (e.g., "1", "2.1", "2.1.1"),
    children: [nested sections]
  }] 
}

Include sections for: Opening, Agenda Discussion, Decisions Made, Action Items, Next Steps, Closing`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert at creating structured table of contents. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const toc = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Failed to parse response' };

    // Save to database
    const { data: savedOutput, error: saveError } = await supabase
      .from('studio_outputs')
      .insert({
        meeting_id: meetingId,
        output_type: 'table_of_contents',
        content: toc,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ toc, outputId: savedOutput.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-table-of-contents:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
