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
    const { meetingId, summaryType, templateId, generationMethod } = await req.json();
    
    console.log('Generate summary request:', { meetingId, summaryType, templateId, generationMethod });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get meeting and transcription data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*, transcriptions(*)')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    const transcription = meeting.transcriptions?.[0];
    if (!transcription) {
      return new Response(
        JSON.stringify({ error: 'No transcription available. Please transcribe the meeting first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let prompt = '';
    let systemPrompt = 'You are an expert meeting analyst and summarization specialist.';
    let templateName = null;

    // Build prompt based on generation method
    if (generationMethod === 'template' && templateId) {
      // Get template structure
      const { data: template, error: templateError } = await supabase
        .from('meeting_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      templateName = template.name;
      const sections = template.sections || [];
      const sectionNames = sections.map((s: any) => s.name).join(', ');

      systemPrompt = `You are an expert meeting analyst. Generate a ${summaryType.replace('_', ' ')} summary following the provided template structure with sections: ${sectionNames}. Ensure all required sections are addressed.`;

      prompt = `Generate a ${summaryType.replace('_', ' ')} summary for this meeting following the template structure below.

Template: ${template.name}
${template.description || ''}

Required Sections:
${sections.map((s: any, idx: number) => `${idx + 1}. ${s.name}${s.required ? ' (Required)' : ''}`).join('\n')}

Meeting Content:
${transcription.content}

Please structure your response according to the template sections above. For each section, provide relevant content based on the meeting transcript. If a section doesn't apply, mention that briefly.`;

    } else {
      // Standard generation without template
      const summaryInstructions = {
        brief: 'Provide a concise 2-3 paragraph overview of the key discussion points and decisions.',
        detailed: 'Provide a comprehensive summary including all topics discussed, decisions made, action items identified, and the context and rationale for major decisions. Include participant contributions where relevant.',
        executive: 'Provide a high-level executive summary focusing on strategic decisions, key risks, critical outcomes, and items requiring leadership attention. Be concise but thorough.',
        action_items: 'Extract all action items from the meeting. For each action item, provide: the task description, who should complete it (if mentioned), priority level, and any mentioned deadlines. Format as a bullet list.'
      };

      prompt = `${summaryInstructions[summaryType as keyof typeof summaryInstructions]}

Meeting Transcription:
${transcription.content}`;
    }

    // Call Lovable AI
    console.log('Calling Lovable AI for summary generation...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    console.log('Summary generated successfully');

    // Store the generated summary
    const { error: insertError } = await supabase
      .from('meeting_summaries')
      .insert({
        meeting_id: meetingId,
        summary_type: summaryType,
        content: generatedContent,
        model_used: generationMethod === 'template' ? `Template: ${templateName}` : 'google/gemini-2.5-flash',
        confidence_score: 0.92,
        metadata: {
          generation_method: generationMethod,
          template_id: templateId || null,
        }
      });

    if (insertError) {
      console.error('Error saving summary:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: generatedContent,
        summaryType,
        generationMethod 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-summary-with-template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
