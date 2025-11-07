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
    const { query, meetingId, emotionFilter, limit = 10 } = await req.json();

    if (!query) {
      throw new Error('Missing required field: query');
    }

    console.log('Semantic search query:', query);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate embedding for search query
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding generation failed: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search similar embeddings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build the query with optional filters
    let searchQuery = supabase.rpc('match_transcriptions', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
    });

    if (meetingId) {
      searchQuery = searchQuery.eq('meeting_id', meetingId);
    }

    const { data: matches, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    // If emotion filter is specified, fetch emotional analysis for results
    let enrichedResults = matches;
    if (emotionFilter && matches.length > 0) {
      const transcriptionIds = matches.map((m: any) => m.transcription_id);
      
      const { data: emotions, error: emotionError } = await supabase
        .from('emotional_analysis')
        .select('transcription_id, primary_emotion, sentiment, energy_level')
        .in('transcription_id', transcriptionIds);

      if (!emotionError && emotions) {
        enrichedResults = matches.map((match: any) => {
          const emotion = emotions.find(e => e.transcription_id === match.transcription_id);
          return {
            ...match,
            emotion: emotion || null,
          };
        }).filter((result: any) => {
          if (emotionFilter) {
            return result.emotion?.primary_emotion === emotionFilter;
          }
          return true;
        });
      }
    }

    console.log(`Found ${enrichedResults.length} semantic matches`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: enrichedResults,
        query: query,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in semantic-search:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Semantic search failed',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
