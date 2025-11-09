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
    
    if (!dictation || !userId) {
      throw new Error('Dictation and userId are required')
    }

    // Parse the dictation to extract action details
    // Expected formats:
    // "Add action: [description] by [date]"
    // "Create task: [description] for [assignee] due [date]"
    // "Action item: [description] priority [high/medium/low]"
    
    const normalized = dictation.toLowerCase().trim()
    
    // Extract title/description
    let title = dictation
    let dueDate: string | null = null
    let priority: 'low' | 'medium' | 'high' = 'medium'
    
    // Remove command prefix
    title = title
      .replace(/^(add action:|create task:|action item:|new action:)/i, '')
      .trim()
    
    // Extract due date patterns
    const datePatterns = [
      /by (tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /due (tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /by (\d{1,2}\/\d{1,2})/,
      /due (\d{1,2}\/\d{1,2})/,
    ]
    
    for (const pattern of datePatterns) {
      const match = normalized.match(pattern)
      if (match) {
        const dateStr = match[1]
        title = title.replace(pattern, '').trim()
        
        // Convert to date
        const today = new Date()
        if (dateStr === 'today') {
          dueDate = today.toISOString().split('T')[0]
        } else if (dateStr === 'tomorrow') {
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          dueDate = tomorrow.toISOString().split('T')[0]
        } else if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(dateStr)) {
          // Find next occurrence of this day
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const targetDay = days.indexOf(dateStr)
          const currentDay = today.getDay()
          const daysUntil = (targetDay - currentDay + 7) % 7 || 7
          const targetDate = new Date(today)
          targetDate.setDate(targetDate.getDate() + daysUntil)
          dueDate = targetDate.toISOString().split('T')[0]
        } else {
          // Handle MM/DD format
          const [month, day] = dateStr.split('/').map(Number)
          const year = today.getFullYear()
          const targetDate = new Date(year, month - 1, day)
          if (targetDate < today) {
            targetDate.setFullYear(year + 1)
          }
          dueDate = targetDate.toISOString().split('T')[0]
        }
        break
      }
    }
    
    // Extract priority
    const priorityMatch = normalized.match(/priority (high|medium|low)/i)
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low'
      title = title.replace(/priority (high|medium|low)/gi, '').trim()
    }
    
    // If no due date extracted, set default to 7 days from now
    if (!dueDate) {
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 7)
      dueDate = defaultDate.toISOString().split('T')[0]
    }
    
    // Clean up title
    title = title.replace(/\s+/g, ' ').trim()
    
    // Create the action item
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data, error } = await supabase
      .from('action_items')
      .insert({
        title,
        description: `Created via voice dictation: "${dictation}"`,
        assigned_to: userId, // Assign to the creator by default
        created_by: userId,
        due_date: dueDate,
        priority,
        meeting_id: meetingId || null,
        status: 'pending',
      })
      .select()
      .single()
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({
        success: true,
        action: data,
        parsedDetails: {
          title,
          dueDate,
          priority
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error creating dictated action:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
