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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    const systemPrompt = `You are a helpful AI assistant that answers questions based on provided sources.

CRITICAL INSTRUCTIONS:
1. Detect the language of the user's question and respond in THE SAME LANGUAGE
2. Support all languages including Amharic (አማርኛ), Arabic, Hebrew, Chinese, Japanese, and any other language
3. When referencing information, cite sources using [SOURCE_X] notation where X is the source number
4. Maintain natural, fluent communication in the user's language
5. Provide comprehensive yet concise answers
6. Use markdown formatting for clarity (bold, lists, etc.)

Provide a clear answer with inline citations in the same language as the user's question.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Sources:\n${contextWithIds.substring(0, 30000)}\n\nUser question: ${query}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2048,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (response.status === 402) {
        throw new Error('AI usage limit reached. Please add credits to your workspace.');
      }
      
      throw new Error('Failed to generate answer');
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    // Extract cited source indices
    const citationMatches = answer.matchAll(/\[SOURCE_(\d+)\]/g);
    const citedIndices = new Set([...citationMatches].map(m => parseInt(m[1])));
    const citedSources = sources.filter((_, idx) => citedIndices.has(idx));

    // Detect language from the query (simple heuristic based on character ranges)
    let detectedLanguage = 'English';
    if (/[\u1200-\u137F]/.test(query)) detectedLanguage = 'Amharic';
    else if (/[\u0600-\u06FF]/.test(query)) detectedLanguage = 'Arabic';
    else if (/[\u4E00-\u9FFF]/.test(query)) detectedLanguage = 'Chinese';
    else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(query)) detectedLanguage = 'Japanese';
    else if (/[\uAC00-\uD7AF]/.test(query)) detectedLanguage = 'Korean';
    else if (/[\u0590-\u05FF]/.test(query)) detectedLanguage = 'Hebrew';

    return new Response(
      JSON.stringify({ 
        answer, 
        sources: citedSources.map(s => ({ id: s.id, title: s.title, type: s.source_type })),
        totalSources: sources.length,
        detectedLanguage
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
