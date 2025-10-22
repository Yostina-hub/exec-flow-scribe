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
    const { sourceIds, notebookId } = await req.json();
    
    if (!sourceIds || sourceIds.length === 0) {
      throw new Error('No source IDs provided');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!GEMINI_API_KEY || !ELEVENLABS_API_KEY) {
      throw new Error('API keys not configured');
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
      `Source: ${s.title}\nType: ${s.source_type}\n\nContent:\n${s.content || s.summary || ''}`
    ).join('\n\n---\n\n');

    console.log('Generating podcast script with Gemini...');

    const scriptPrompt = `You are creating a podcast-style audio overview. Generate a natural, engaging conversation between two hosts discussing the following content. 

The conversation should:
- Be between Host 1 (curious, asks questions) and Host 2 (knowledgeable, explains concepts)
- Sound natural and conversational
- Cover the key points from all sources
- Be about 3-5 minutes long when spoken
- Use simple language

Format the output as:
Host 1: [dialogue]
Host 2: [dialogue]

Content:
${combinedContent.substring(0, 15000)}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: scriptPrompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error('Failed to generate podcast script');
    }

    const geminiData = await geminiResponse.json();
    const script = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Script generated, creating audio...');

    const segments = script.split('\n')
      .filter((line: string) => line.trim().startsWith('Host'))
      .map((line: string) => {
        const match = line.match(/(Host \d+):\s*(.+)/);
        if (match) {
          return { speaker: match[1], text: match[2] };
        }
        return null;
      })
      .filter(Boolean);

    const voices = {
      'Host 1': 'pFZP5JQG7iQjIQuC4Bku',
      'Host 2': 'TX3LPaxmHKxFdv7VOQHJ',
    };

    const audioSegments: Uint8Array[] = [];
    
    for (const segment of segments) {
      if (!segment) continue;
      
      const voiceId = voices[segment.speaker as keyof typeof voices] || voices['Host 1'];
      
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: segment.text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            }
          })
        }
      );

      if (!ttsResponse.ok) {
        console.error('ElevenLabs error');
        continue;
      }

      const audioData = await ttsResponse.arrayBuffer();
      audioSegments.push(new Uint8Array(audioData));
    }

    const totalLength = audioSegments.reduce((sum, seg) => sum + seg.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const segment of audioSegments) {
      combined.set(segment, offset);
      offset += segment.length;
    }

    const fileName = `audio-overview-${notebookId}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase
      .storage
      .from('meeting-audio')
      .upload(fileName, combined, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase
      .storage
      .from('meeting-audio')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: urlData.publicUrl,
        segmentCount: audioSegments.length
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
