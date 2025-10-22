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
    const { sourceIds } = await req.json();
    
    if (!sourceIds || sourceIds.length === 0) {
      throw new Error('No source IDs provided');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: sources, error: sourcesError } = await supabase
      .from('notebook_sources')
      .select('*')
      .in('id', sourceIds);

    if (sourcesError) throw sourcesError;

    const combinedContent = sources.map(s => 
      `Source: ${s.title}\n${s.content || s.summary || ''}`
    ).join('\n\n---\n\n');

    const prompt = `Create a study guide from this content:

# Study Guide

## Key Concepts
5-10 main concepts with definitions

## Important Terms
10-15 key terms glossary

## Summary
3-4 paragraph summary

## Practice Questions
10 questions (3 easy, 4 medium, 3 hard)

## Further Study
3-5 topics for deeper exploration

Content:
${combinedContent.substring(0, 20000)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    if (!response.ok) throw new Error('Failed to generate');

    const data = await response.json();
    const studyGuide = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(
      JSON.stringify({ studyGuide, sourceCount: sources.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
