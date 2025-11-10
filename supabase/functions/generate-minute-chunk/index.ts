import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { meetingId, chunkNumber, startTime, endTime, transcriptionText } = await req.json();
    
    if (!meetingId || chunkNumber === undefined || !transcriptionText) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing chunk ${chunkNumber} for meeting ${meetingId} (${startTime}s - ${endTime}s)`);

    // Get meeting details for context
    const { data: meeting } = await supabase
      .from('meetings')
      .select('title, description, agenda')
      .eq('id', meetingId)
      .single();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate incremental summary for this chunk
    const prompt = `Analyze this ${Math.floor((endTime - startTime) / 60)}-minute segment of a meeting and provide a concise summary.

Meeting Context:
- Title: ${meeting?.title || 'N/A'}
- Agenda: ${meeting?.agenda || 'N/A'}
- Time Range: ${Math.floor(startTime / 60)}:${String(startTime % 60).padStart(2, '0')} - ${Math.floor(endTime / 60)}:${String(endTime % 60).padStart(2, '0')}

Transcription Segment:
${transcriptionText}

Provide:
1. A brief summary (2-3 sentences) of this segment
2. Key points discussed (bullet points)
3. Any decisions made
4. Any action items identified

Format as JSON:
{
  "summary": "...",
  "key_points": ["...", "..."],
  "decisions": ["...", "..."],
  "action_items": ["...", "..."]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert meeting analyst. Provide concise, structured summaries.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      summary: content,
      key_points: [],
      decisions: [],
      action_items: []
    };

    // Store the chunk
    const { error: insertError } = await supabase
      .from('minute_chunks')
      .upsert({
        meeting_id: meetingId,
        chunk_number: chunkNumber,
        start_time: startTime,
        end_time: endTime,
        transcription_text: transcriptionText,
        summary: parsed.summary,
        key_points: parsed.key_points,
        decisions: parsed.decisions,
        action_items: parsed.action_items,
      });

    if (insertError) {
      console.error('Error storing chunk:', insertError);
      throw insertError;
    }

    console.log(`Chunk ${chunkNumber} generated and stored successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        chunkNumber,
        summary: parsed.summary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating minute chunk:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});