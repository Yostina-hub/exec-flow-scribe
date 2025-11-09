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
    const { content, targetLanguage } = await req.json();
    
    if (!content || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Content and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const languageNames: Record<string, string> = {
      'am': 'Amharic (using Ge\'ez script)',
      'en': 'English',
      'or': 'Afaan Oromo (using Latin script - Qubee)',
      'so': 'Somali / Af-Soomaali (using Latin script)',
      'ti': 'Tigrinya (using Ge\'ez script)'
    };

    const languageInstructions: Record<string, string> = {
      'am': `
CRITICAL AMHARIC WRITING REQUIREMENTS:
• Write ENTIRELY in AMHARIC using Ge'ez script (ሀ ለ ሐ መ ሠ ረ ሰ ሸ ቀ በ ተ ቸ ኀ ነ ኘ አ ከ ኸ ወ ዐ ዘ ዠ የ ደ ጀ ገ ጠ ጨ ጰ ጸ ፀ ፈ ፐ)
• NEVER use Latin letters (a-z) or romanization
• ALL headings, titles, content MUST be Ge'ez script

ETHIOPIAN PUNCTUATION (MANDATORY):
• ። = Full stop (end of sentence)
• ፣ = Comma
• ፤ = Semicolon
• ፦ = Colon

MAINTAIN:
• Same structure and formatting as original
• All markdown headers (##)
• All lists and tables
• Professional business Amharic vocabulary`,
      'or': `
CRITICAL AFAAN OROMO WRITING REQUIREMENTS:
• Write ENTIRELY in AFAAN OROMO using Latin script (Qubee alphabet)
• Use standard Oromo orthography with proper diacritics
• ALL headings, titles, content MUST be in Afaan Oromo

OROMO SPECIAL CHARACTERS (MANDATORY):
• Use correct Oromo letters: a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, w, x, y, z
• Proper diacritics: ' (apostrophe for glottal stop)
• Double consonants where appropriate (bb, dd, ff, gg, etc.)

MAINTAIN:
• Same structure and formatting as original
• All markdown headers (##)
• All lists and tables
• Professional business Oromo vocabulary`,
      'en': `
ENGLISH REQUIREMENTS:
• Clear, professional business English
• Maintain same structure as original
• Use proper grammar and punctuation`,
      'so': `
CRITICAL SOMALI / AF-SOOMAALI WRITING REQUIREMENTS:
• Write ENTIRELY in SOMALI (AF-SOOMAALI) using Latin script
• Use standard Somali orthography with proper characters
• ALL headings, titles, content MUST be in Somali

SOMALI SPECIAL CHARACTERS (MANDATORY):
• Standard Latin letters: a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, w, x, y
• Important digraphs: dh, kh, sh
• Proper vowel usage: a, e, i, o, u (short and long)

MAINTAIN:
• Same structure and formatting as original
• All markdown headers (##)
• All lists and tables
• Professional business Somali vocabulary`,
      'ti': `
CRITICAL TIGRINYA WRITING REQUIREMENTS:
• Write ENTIRELY in TIGRINYA using Ge'ez script (ሀ ለ ሐ መ ሠ ረ ሰ ሸ ቀ በ ተ ቸ ኀ ነ ኘ አ ከ ኸ ወ ዐ ዘ ዠ የ ደ ጀ ገ ጠ ጨ ጰ ጸ ፀ ፈ ፐ)
• NEVER use Latin letters (a-z) or romanization
• ALL headings, titles, content MUST be Ge'ez script

ETHIOPIC PUNCTUATION (MANDATORY):
• ። = Full stop (end of sentence)
• ፣ = Comma
• ፤ = Semicolon
• ፦ = Colon

MAINTAIN:
• Same structure and formatting as original
• All markdown headers (##)
• All lists and tables
• Professional business Tigrinya vocabulary`
     };

    const prompt = `Translate the following meeting minutes to ${languageNames[targetLanguage]}.

${languageInstructions[targetLanguage]}

CRITICAL RULES:
• Preserve ALL markdown formatting (headers, lists, tables, bold, italic)
• Keep the exact same structure and organization
• Translate content accurately while maintaining professional tone
• Do NOT add or remove any sections
• Do NOT summarize or expand - just translate

Original Content:
${content}`;

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
            content: "You are an expert translator specializing in meeting minutes and business documents. You maintain perfect formatting while translating accurately."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 16000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedContent = data.choices?.[0]?.message?.content;

    if (!translatedContent) {
      throw new Error("No translation generated");
    }

    return new Response(
      JSON.stringify({ translatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Translation failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
