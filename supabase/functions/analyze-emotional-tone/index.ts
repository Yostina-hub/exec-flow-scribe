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
    const { transcriptionId, meetingId, content, speakerName } = await req.json();

    if (!transcriptionId || !meetingId || !content) {
      throw new Error('Missing required fields: transcriptionId, meetingId, content');
    }

    console.log('Analyzing emotional tone for transcription:', transcriptionId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI to analyze emotional tone
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert emotional intelligence analyst. Analyze the emotional tone of speech transcriptions.

Return a JSON object with this exact structure:
{
  "primary_emotion": "one of: joy, sadness, anger, fear, surprise, disgust, neutral, excitement, anxiety, frustration, confidence, uncertainty",
  "emotion_score": 0.85,
  "secondary_emotions": ["emotion1", "emotion2"],
  "sentiment": "positive, negative, or neutral",
  "energy_level": "high, medium, or low",
  "confidence": 0.92
}

Be precise and objective. Base your analysis only on the text provided.`
          },
          {
            role: 'user',
            content: `Analyze the emotional tone of this transcription:\n\n"${content}"\n\nSpeaker: ${speakerName || 'Unknown'}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    console.log('AI analysis result:', analysisText);

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      throw new Error('Invalid AI response format');
    }

    // Store the analysis in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('emotional_analysis')
      .insert({
        transcription_id: transcriptionId,
        meeting_id: meetingId,
        speaker_name: speakerName,
        primary_emotion: analysis.primary_emotion,
        emotion_score: analysis.emotion_score,
        secondary_emotions: analysis.secondary_emotions,
        sentiment: analysis.sentiment,
        energy_level: analysis.energy_level,
        confidence: analysis.confidence,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Emotional analysis saved:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-emotional-tone:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to analyze emotional tone',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
