import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetings } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Prepare meeting data for AI analysis
    const meetingsSummary = meetings.map((m: any) => ({
      title: m.title,
      date: m.start_time,
      status: m.status,
      attendees: m.attendee_count || 0,
      location: m.location,
    }));

    const prompt = `Analyze these meetings and provide:
1. A brief executive summary (2-3 sentences)
2. Key patterns you notice (3-5 bullet points)
3. Actionable suggestions for improvement (3-5 bullet points)

Meetings data:
${JSON.stringify(meetingsSummary, null, 2)}

Format your response as JSON with keys: summary, patterns (array), suggestions (array)`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an executive meeting analyst. Provide concise, actionable insights.\n\n${prompt}\n\nRespond with valid JSON only, no markdown formatting.`
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Brief executive summary of meeting patterns"
              },
              patterns: {
                type: "array",
                items: { type: "string" },
                description: "Key patterns noticed in the meetings"
              },
              suggestions: {
                type: "array",
                items: { type: "string" },
                description: "Actionable suggestions for improvement"
              }
            },
            required: ["summary", "patterns", "suggestions"]
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2));

    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const insights = textContent 
      ? JSON.parse(textContent)
      : { 
          summary: "Unable to generate insights at this time.",
          patterns: [],
          suggestions: []
        };

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-meeting-overview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        summary: "An error occurred while analyzing meetings.",
        patterns: [],
        suggestions: []
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
