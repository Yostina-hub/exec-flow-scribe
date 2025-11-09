import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dictation, meetingId, userId } = await req.json()
    
    if (!dictation || !meetingId || !userId) {
      throw new Error('Dictation, meetingId, and userId are required')
    }

    // Parse the dictation to extract decision details
    // Expected formats:
    // "Add decision: [text]"
    // "Record decision: [text]"
    // "Decision: [text]"
    
    let decisionText = dictation.trim()
    let context = ''
    
    // Remove command prefix
    decisionText = decisionText
      .replace(/^(add decision:|record decision:|new decision:|decision:)/i, '')
      .trim()
    
    // Extract context if present (e.g., "by CEO", "made by team")
    const contextMatch = decisionText.match(/(by|made by|decided by) ([^.]+)/i)
    if (contextMatch) {
      context = contextMatch[2].trim()
      decisionText = decisionText.replace(contextMatch[0], '').trim()
    }
    
    // Clean up text
    decisionText = decisionText.replace(/\s+/g, ' ').trim()
    
    // Create the decision
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data, error } = await supabase
      .from('decisions')
      .insert({
        meeting_id: meetingId,
        decision_text: decisionText,
        created_by: userId,
        context: context || `Voice dictation: "${dictation}"`,
        status: 'approved', // Auto-approve dictated decisions
      })
      .select()
      .single()
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({
        success: true,
        decision: data,
        parsedDetails: {
          decisionText,
          context
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error creating dictated decision:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
