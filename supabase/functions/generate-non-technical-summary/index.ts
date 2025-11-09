import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, language } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const lang = language || 'en';
    
    const languageInstructions: Record<string, string> = {
      'am': `
Write the summary in AMHARIC using Ge'ez script.
Use Ethiopian punctuation: ። (full stop), ፣ (comma), ፦ (colon)
Use simple, everyday Amharic words that anyone can understand.`,
      'or': `
Write the summary in AFAAN OROMO using Latin script (Qubee).
Use simple, everyday Oromo words that anyone can understand.`,
      'so': `
Write the summary in SOMALI (AF-SOOMAALI) using Latin script.
Use simple, everyday Somali words that anyone can understand.`,
      'en': `
Write the summary in ENGLISH.
Use simple, everyday words that anyone can understand.`
    };

    const prompt = `Create a NON-TECHNICAL, easy-to-understand summary of these meeting minutes.

TARGET AUDIENCE: People with NO technical background - explain everything in simple terms.

${languageInstructions[lang]}

WRITING STYLE:
• Use everyday language a 10-year-old could understand
• Replace technical terms with simple explanations
• Use analogies and examples when helpful
• Break down complex concepts into simple ideas
• Use short sentences and simple words
• Explain acronyms and jargon in plain language
• Make it conversational and friendly

STRUCTURE:
1. **What This Meeting Was About** - One simple sentence
2. **Main Topics Discussed** - Key points in simple terms
3. **Important Decisions** - What was decided and why (in simple words)
4. **Things People Need to Do** - Action items explained simply
5. **Key Takeaways** - Main points anyone should remember

KEEP IT:
• Clear and simple
• Free of jargon
• Easy to read
• Conversational tone
• Friendly and accessible

Original Meeting Minutes:
${content}

Generate a non-technical summary that anyone can understand:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert at explaining complex topics in simple, easy-to-understand language. You write for people with no technical background."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`Generation failed: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No summary generated");
    }

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Summary generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Summary generation failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
