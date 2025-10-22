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
    const { query, sourceIds } = await req.json();
    
    if (!query) {
      throw new Error('No query provided');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch sources
    const { data: sources, error: sourcesError } = await supabase
      .from('notebook_sources')
      .select('*')
      .in('id', sourceIds);

    if (sourcesError) throw sourcesError;

    // Create context with source IDs
    const contextWithIds = sources.map((s, idx) => 
      `[SOURCE_${idx}] Title: ${s.title}\nType: ${s.source_type}\n\nContent:\n${s.content || s.summary || ''}`
    ).join('\n\n---\n\n');

    const prompt = `You are a helpful AI assistant that answers questions based on provided sources.

CRITICAL INSTRUCTIONS:
1. Detect the language of the user's question and respond in THE SAME LANGUAGE
2. Support all languages including Amharic (አማርኛ), Arabic, Hebrew, Chinese, Japanese, and any other language
3. When referencing information, cite sources using [SOURCE_X] notation where X is the source number
4. Maintain natural, fluent communication in the user's language

User question: ${query}

Sources:
${contextWithIds.substring(0, 20000)}

Provide a clear, comprehensive answer with inline citations in the same language as the user's question.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate answer');
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract cited source indices
    const citationMatches = answer.matchAll(/\[SOURCE_(\d+)\]/g);
    const citedIndices = new Set([...citationMatches].map(m => parseInt(m[1])));
    const citedSources = sources.filter((_, idx) => citedIndices.has(idx));

    return new Response(
      JSON.stringify({ 
        answer, 
        sources: citedSources.map(s => ({ id: s.id, title: s.title, type: s.source_type })),
        totalSources: sources.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
