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
    const { assigneeName, actionId, userId } = await req.json()
    
    if (!assigneeName || !actionId || !userId) {
      throw new Error('Assignee name, action ID, and user ID are required')
    }

    console.log('Voice assignment request:', { assigneeName, actionId, userId })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Search for user by name (case-insensitive, partial match)
    const normalizedName = assigneeName.toLowerCase().trim()
    
    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${normalizedName}%,email.ilike.%${normalizedName}%`)
    
    if (searchError) {
      console.error('Error searching for user:', searchError)
      throw new Error('Failed to search for user')
    }
    
    if (!profiles || profiles.length === 0) {
      throw new Error(`No user found matching "${assigneeName}". Please check the name and try again.`)
    }
    
    // If multiple matches, prefer exact match, otherwise use first result
    let selectedProfile = profiles[0]
    const exactMatch = profiles.find(p => 
      p.full_name?.toLowerCase() === normalizedName ||
      p.email?.toLowerCase() === normalizedName
    )
    if (exactMatch) {
      selectedProfile = exactMatch
    }
    
    console.log('Found user:', selectedProfile)
    
    // Verify the action exists and user has permission
    const { data: action, error: actionError } = await supabase
      .from('action_items')
      .select('id, title, created_by, assigned_to')
      .eq('id', actionId)
      .single()
    
    if (actionError || !action) {
      throw new Error('Action item not found')
    }
    
    // Check if user has permission to assign (creator or admin)
    if (action.created_by !== userId) {
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
        throw new Error('You do not have permission to reassign this action')
      }
    }
    
    // Update the assignment
    const { error: updateError } = await supabase
      .from('action_items')
      .update({ 
        assigned_to: selectedProfile.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
    
    if (updateError) {
      console.error('Error updating assignment:', updateError)
      throw new Error('Failed to assign task')
    }
    
    console.log('Task assigned successfully')
    
    // Create notification for the new assignee
    await supabase
      .from('notifications')
      .insert({
        user_id: selectedProfile.id,
        title: 'New Task Assigned',
        message: `You have been assigned: "${action.title}" via voice command`,
        type: 'action_assigned',
        related_id: actionId
      })
      .then(result => {
        if (result.error) {
          console.error('Error creating notification:', result.error)
        }
      })
    
    return new Response(
      JSON.stringify({
        success: true,
        assignedTo: {
          id: selectedProfile.id,
          name: selectedProfile.full_name || selectedProfile.email,
          email: selectedProfile.email
        },
        action: {
          id: action.id,
          title: action.title
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in voice assignment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
