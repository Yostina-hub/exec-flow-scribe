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
    const { templateId } = await req.json();
    
    console.log('Analyzing template performance:', templateId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get template performance data
    const { data: performance, error: perfError } = await supabase
      .from('template_performance_analysis')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (perfError) throw perfError;

    // Skip analysis if insufficient data
    if (!performance || performance.total_summaries < 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient data for analysis. Need at least 3 summaries.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get low-rated summaries for analysis
    const lowRatedIds = performance.low_rated_summary_ids || [];
    let editPatterns: Array<{ original_content: string; edited_content: string; edit_type: string }> = [];

    if (lowRatedIds.length > 0) {
      const { data: edits, error: editsError } = await supabase
        .from('summary_edit_history')
        .select('original_content, edited_content, edit_type')
        .in('summary_id', lowRatedIds)
        .limit(10);

      if (!editsError && edits) {
        editPatterns = edits;
      }
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('meeting_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Build analysis prompt for AI
    const analysisPrompt = `Analyze this meeting template's performance and suggest improvements:

Template: ${template.name}
Description: ${template.description || 'N/A'}
Sections: ${JSON.stringify(template.sections, null, 2)}

Performance Metrics:
- Total Summaries Generated: ${performance.total_summaries}
- Average Rating: ${performance.avg_rating ? performance.avg_rating.toFixed(2) : 'N/A'}/5
- Average Edits per Summary: ${performance.avg_edits ? performance.avg_edits.toFixed(1) : 'N/A'}
- Major Edits: ${performance.major_edits || 0}
- Average Regenerations: ${performance.avg_regenerations ? performance.avg_regenerations.toFixed(1) : 'N/A'}

${editPatterns.length > 0 ? `Common Edit Patterns (from low-rated summaries):
${editPatterns.map((e, i) => `
Edit ${i + 1} (${e.edit_type}):
Original excerpt: ${e.original_content.substring(0, 200)}...
Edited to: ${e.edited_content.substring(0, 200)}...
`).join('\n')}` : 'No edit patterns available.'}

Based on this data, provide specific, actionable improvements to the template structure and prompt instructions. Focus on:
1. Sections that may be missing or unnecessary
2. Prompt refinements to reduce edits
3. Structural changes to improve clarity
4. Any patterns in the edits that suggest template issues

Format your response as a JSON object with this structure:
{
  "suggestions": [
    {
      "type": "prompt_refinement" | "section_addition" | "section_removal" | "structure_change",
      "title": "Brief title",
      "rationale": "Why this change is needed based on the data",
      "suggested_prompt": "The improved prompt or structure",
      "confidence": 0.0-1.0
    }
  ]
}`;

    console.log('Calling AI for template analysis...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert in meeting documentation and template optimization. Analyze performance data and suggest concrete improvements.' 
          },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisResult = aiData.choices?.[0]?.message?.content;

    if (!analysisResult) {
      throw new Error('No analysis generated from AI');
    }

    // Parse AI response
    let suggestions;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = analysisResult.match(/```json\n([\s\S]+?)\n```/) || 
                       analysisResult.match(/```\n([\s\S]+?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : analysisResult;
      suggestions = JSON.parse(jsonStr).suggestions;
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI suggestions');
    }

    // Store suggestions in database
    const insertPromises = suggestions.map((suggestion: any) => 
      supabase
        .from('template_improvement_suggestions')
        .insert({
          template_id: templateId,
          suggestion_type: suggestion.type,
          current_prompt: JSON.stringify(template),
          suggested_prompt: suggestion.suggested_prompt,
          rationale: suggestion.rationale,
          based_on_summaries: lowRatedIds,
          confidence_score: suggestion.confidence,
          status: 'pending'
        })
    );

    await Promise.all(insertPromises);

    console.log(`Generated ${suggestions.length} improvement suggestions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestionsCount: suggestions.length,
        suggestions 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-template-performance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
