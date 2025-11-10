import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, content, sourceLanguage, targetLanguage } = await req.json();

    if (!meetingId || !content || !sourceLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // If targetLanguage is specified, only translate to that language
    // Otherwise, translate to all languages except source
    const allLanguages = ['am', 'en', 'or', 'so', 'ti'];
    const targetLanguages = targetLanguage 
      ? [targetLanguage]
      : allLanguages.filter(lang => lang !== sourceLanguage);

    console.log(`Starting translation for meeting ${meetingId} from ${sourceLanguage} to:`, targetLanguages);

    // Translate to all target languages in parallel
    const translationPromises = targetLanguages.map(async (targetLang) => {
      try {
        const languageNames: { [key: string]: string } = {
          'am': 'Amharic (አማርኛ) using Ge\'ez script with Ethiopian punctuation',
          'en': 'English with standard punctuation',
          'or': 'Afaan Oromo with appropriate punctuation',
          'so': 'Somali (Af-Soomaali) with standard punctuation',
          'ti': 'Tigrinya (ትግርኛ) using Ge\'ez script with Ethiopian punctuation'
        };

        const prompt = `You are a highly skilled professional translator specializing in Ethiopian languages and executive business documentation. Translate the following meeting minutes with absolute precision and professionalism.

CRITICAL TRANSLATION REQUIREMENTS:

📋 STRUCTURAL FIDELITY:
• Maintain EXACT structure, formatting, all headers, and complete markdown syntax
• Preserve all tables in proper markdown format with aligned columns
• Keep ALL bullet points, numbering, and list structures identical
• Maintain paragraph breaks and visual hierarchy exactly as in source
• DO NOT add or remove any sections, headers, or structural elements

🎯 TRANSLATION EXCELLENCE:
• Translate from ${languageNames[sourceLanguage]} to ${languageNames[targetLang]}
• Use PROFESSIONAL, EXECUTIVE-LEVEL language appropriate for official business documentation
• Maintain the same level of formality, gravitas, and sophistication
• Employ formal business terminology with precision and accuracy
• Keep technical terms accurate - translate or transliterate appropriately based on target language norms

📍 LANGUAGE-SPECIFIC REQUIREMENTS:

${targetLang === 'am' || targetLang === 'ti' ? `For ${languageNames[targetLang]}:
• Use Ethiopian punctuation CONSISTENTLY and CORRECTLY:
  ። = Full stop (end EVERY sentence)
  ፣ = Comma (separate items and clauses)
  ፤ = Semicolon (connect related clauses)
  ፦ = Colon (introduce lists and elaborations)
  ፥ = Section marker (major breaks)
• Write in natural, flowing formal business language using proper SOV structure
• Use executive-level vocabulary: ስብሰባ (meeting), ውይይት (discussion), ውሳኔ (decision), ተግባር (action)
• Apply proper honorifics: አቶ, ወ/ሮ, ዶ/ር, ኢንጅነር, etc.
• Ensure flawless Ge\'ez script spelling and grammar
• Make it read like documentation from Ethiopia's most skilled executive secretary` : 
`For ${languageNames[targetLang]}:
• Use proper punctuation for this language consistently
• Apply formal business vocabulary and executive-level tone
• Ensure grammatical perfection and natural flow
• Maintain professional standards appropriate for official organizational records`}

🔒 CONTENT PRESERVATION:
• Preserve ALL names, dates, times, locations, and numerical data EXACTLY as they appear
• Keep all proper nouns in their original form unless translation is standard practice
• Maintain all emphasis, formatting (bold, italic), and special markers
• DO NOT add explanations, interpretations, or additional context
• DO NOT remove or summarize any content - translate everything

🏆 QUALITY STANDARDS:
• Professional enough for executive board presentations
• Accurate enough for legal and official organizational records  
• Polished enough to represent highest institutional standards
• Natural enough to read as if originally written in target language

SOURCE CONTENT TO TRANSLATE:

${content}

Provide ONLY the professionally translated content, maintaining exact formatting and structure.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a professional translator specializing in Ethiopian languages and executive business documentation. You maintain perfect fidelity to the source while adapting language naturally.`
              },
              { role: "user", content: prompt }
            ],
            max_tokens: 10000,
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Translation to ${targetLang} failed:`, response.status, errorText);
          throw new Error(`Translation failed: ${response.status}`);
        }

        const data = await response.json();
        const translatedContent = data.choices?.[0]?.message?.content || "";

        if (!translatedContent) {
          throw new Error("Empty translation response");
        }

        // Store translation in database
        const { error: insertError } = await supabase
          .from('minute_translations')
          .upsert({
            meeting_id: meetingId,
            language: targetLang,
            content: translatedContent,
            source_language: sourceLanguage,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'meeting_id,language'
          });

        if (insertError) {
          console.error(`Error storing ${targetLang} translation:`, insertError);
          throw insertError;
        }

        console.log(`✅ Successfully translated and stored ${targetLang} version`);
        return { language: targetLang, success: true };

      } catch (error) {
        console.error(`Error translating to ${targetLang}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Translation error';
        return { language: targetLang, success: false, error: errorMessage };
      }
    });

    // Wait for all translations to complete
    const results = await Promise.all(translationPromises);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Batch translation complete: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: targetLanguages.length,
          succeeded: successCount,
          failed: failureCount
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Batch translation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Translation failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
