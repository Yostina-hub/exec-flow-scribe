import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DueDateRequest {
  taskId: string;
  dueDate: string;
  userId: string;
}

function parseDateFromNaturalLanguage(dateText: string): Date | null {
  const now = new Date();
  const text = dateText.toLowerCase().trim();

  // Today
  if (text === 'today') {
    return now;
  }

  // Tomorrow
  if (text === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Yesterday
  if (text === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Next week
  if (text === 'next week') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  // Day of week (Monday, Tuesday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = text.match(/(?:next\s+)?(\w+day)/);
  if (dayMatch) {
    const dayName = dayMatch[1].toLowerCase();
    const dayIndex = dayNames.indexOf(dayName);
    if (dayIndex !== -1) {
      const isNext = text.includes('next');
      const targetDate = new Date(now);
      const currentDay = targetDate.getDay();
      let daysToAdd = dayIndex - currentDay;
      
      if (daysToAdd <= 0 || isNext) {
        daysToAdd += 7;
      }
      
      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return targetDate;
    }
  }

  // In X days/weeks
  const relativeMatch = text.match(/(?:in\s+)?(\d+)\s+(day|week|month)s?/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    const targetDate = new Date(now);
    
    if (unit === 'day') {
      targetDate.setDate(targetDate.getDate() + amount);
    } else if (unit === 'week') {
      targetDate.setDate(targetDate.getDate() + (amount * 7));
    } else if (unit === 'month') {
      targetDate.setMonth(targetDate.getMonth() + amount);
    }
    
    return targetDate;
  }

  // X days/weeks from now
  const fromNowMatch = text.match(/(\d+)\s+(day|week|month)s?\s+from\s+now/);
  if (fromNowMatch) {
    const amount = parseInt(fromNowMatch[1]);
    const unit = fromNowMatch[2];
    const targetDate = new Date(now);
    
    if (unit === 'day') {
      targetDate.setDate(targetDate.getDate() + amount);
    } else if (unit === 'week') {
      targetDate.setDate(targetDate.getDate() + (amount * 7));
    } else if (unit === 'month') {
      targetDate.setMonth(targetDate.getMonth() + amount);
    }
    
    return targetDate;
  }

  // Try standard date parsing as fallback
  const parsedDate = new Date(dateText);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { taskId, dueDate, userId }: DueDateRequest = await req.json();

    console.log('Processing due date update:', { taskId, dueDate, userId });

    if (!taskId || !dueDate || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the natural language date
    const parsedDate = parseDateFromNaturalLanguage(dueDate);
    
    if (!parsedDate) {
      return new Response(
        JSON.stringify({ error: 'Could not understand the date. Try: tomorrow, Friday, next week, in 3 days' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format date as YYYY-MM-DD
    const formattedDate = parsedDate.toISOString().split('T')[0];

    // Get the task to verify existence and permissions
    const { data: task, error: taskError } = await supabase
      .from('action_items')
      .select('*, meetings(created_by)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error('Task not found:', taskError);
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission (is assigned, creator, or meeting host)
    const hasPermission = 
      task.assigned_to === userId || 
      task.created_by === userId ||
      task.meetings?.created_by === userId;

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to update this task' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the task due date
    const { data: updatedTask, error: updateError } = await supabase
      .from('action_items')
      .update({ due_date: formattedDate })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating task:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update task due date' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Task due date updated successfully:', updatedTask);

    // Create notification if assignee is different from requester
    if (task.assigned_to && task.assigned_to !== userId) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        title: 'Task Due Date Updated',
        message: `Due date for "${task.title}" has been changed to ${formattedDate}`,
        type: 'task_update',
        related_id: taskId,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        task: updatedTask,
        dueDate: formattedDate,
        naturalLanguage: dueDate 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-task-due-date function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
