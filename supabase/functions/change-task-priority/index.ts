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
    const { priority, actionId, userId } = await req.json()
    
    if (!priority || !actionId || !userId) {
      throw new Error('Priority, action ID, and user ID are required')
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high']
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority: ${priority}. Must be one of: ${validPriorities.join(', ')}`)
    }

    console.log('Priority change request:', { priority, actionId, userId })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Verify the action exists and user has permission
    const { data: action, error: actionError } = await supabase
      .from('action_items')
      .select('id, title, created_by, assigned_to, priority')
      .eq('id', actionId)
      .single()
    
    if (actionError || !action) {
      throw new Error('Action item not found')
    }
    
    // Check if user has permission (creator, assignee, or admin)
    let hasPermission = action.created_by === userId || action.assigned_to === userId
    
    if (!hasPermission) {
      // Check if user is admin
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId)
      
      const isAdmin = userRoles?.some((ur: any) => 
        ur.roles?.name?.toLowerCase().includes('admin') || 
        ur.roles?.name?.toLowerCase().includes('manager')
      )
      
      if (!isAdmin) {
        throw new Error('You do not have permission to change priority for this action')
      }
    }
    
    // Update the priority
    const { error: updateError } = await supabase
      .from('action_items')
      .update({ 
        priority: priority as 'low' | 'medium' | 'high',
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
    
    if (updateError) {
      console.error('Error updating priority:', updateError)
      throw new Error('Failed to change priority')
    }
    
    console.log('Priority changed successfully')
    
    // Create notification if priority was increased and user is not the assignee
    if (priority === 'high' && userId !== action.assigned_to) {
      await supabase
        .from('notifications')
        .insert({
          user_id: action.assigned_to,
          title: 'Task Priority Changed',
          message: `"${action.title}" priority changed to HIGH`,
          type: 'priority_change',
          related_id: actionId
        })
        .then(result => {
          if (result.error) {
            console.error('Error creating notification:', result.error)
          }
        })
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: {
          id: action.id,
          title: action.title,
          oldPriority: action.priority,
          newPriority: priority
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error changing priority:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
