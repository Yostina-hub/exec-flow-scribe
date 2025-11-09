import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  actionId: string;
  reminderText: string;
}

function parseReminderTime(text: string): { reminderTime: Date | null, relativeToDeadline: boolean, hoursBefore: number | null } {
  const now = new Date();
  const lowerText = text.toLowerCase();
  
  // Check for relative to deadline patterns
  const deadlinePattern = /(\d+)\s*(hour|hours|day|days|minute|minutes)\s+before\s+(deadline|due\s+date)/i;
  const deadlineMatch = text.match(deadlinePattern);
  
  if (deadlineMatch) {
    const amount = parseInt(deadlineMatch[1]);
    const unit = deadlineMatch[2].toLowerCase();
    
    let hoursBefore = 0;
    if (unit.startsWith('minute')) {
      hoursBefore = amount / 60;
    } else if (unit.startsWith('hour')) {
      hoursBefore = amount;
    } else if (unit.startsWith('day')) {
      hoursBefore = amount * 24;
    }
    
    return { reminderTime: null, relativeToDeadline: true, hoursBefore };
  }
  
  // Parse absolute time patterns
  // "tomorrow at 2pm"
  const tomorrowPattern = /tomorrow\s+at\s+(\d+)\s*(am|pm)?/i;
  const tomorrowMatch = text.match(tomorrowPattern);
  if (tomorrowMatch) {
    const hour = parseInt(tomorrowMatch[1]);
    const isPM = tomorrowMatch[2]?.toLowerCase() === 'pm';
    const adjustedHour = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(adjustedHour, 0, 0, 0);
    return { reminderTime: tomorrow, relativeToDeadline: false, hoursBefore: null };
  }
  
  // "in X hours/days"
  const inPattern = /in\s+(\d+)\s+(hour|hours|day|days|minute|minutes)/i;
  const inMatch = text.match(inPattern);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2].toLowerCase();
    
    const reminderTime = new Date(now);
    if (unit.startsWith('minute')) {
      reminderTime.setMinutes(reminderTime.getMinutes() + amount);
    } else if (unit.startsWith('hour')) {
      reminderTime.setHours(reminderTime.getHours() + amount);
    } else if (unit.startsWith('day')) {
      reminderTime.setDate(reminderTime.getDate() + amount);
    }
    return { reminderTime, relativeToDeadline: false, hoursBefore: null };
  }
  
  // "at 3pm today" or "today at 3pm"
  const todayPattern = /(today\s+at|at)\s+(\d+)\s*(am|pm)?/i;
  const todayMatch = text.match(todayPattern);
  if (todayMatch) {
    const hour = parseInt(todayMatch[2]);
    const isPM = todayMatch[3]?.toLowerCase() === 'pm';
    const adjustedHour = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
    
    const reminderTime = new Date(now);
    reminderTime.setHours(adjustedHour, 0, 0, 0);
    return { reminderTime, relativeToDeadline: false, hoursBefore: null };
  }
  
  // "next Monday/Tuesday/etc"
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayPattern = new RegExp(`(next|this)\\s+(${daysOfWeek.join('|')})(?:\\s+at\\s+(\\d+)\\s*(am|pm)?)?`, 'i');
  const dayMatch = text.match(dayPattern);
  if (dayMatch) {
    const targetDay = daysOfWeek.indexOf(dayMatch[2].toLowerCase());
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0 || dayMatch[1].toLowerCase() === 'next') {
      daysToAdd += 7;
    }
    
    const reminderTime = new Date(now);
    reminderTime.setDate(reminderTime.getDate() + daysToAdd);
    
    if (dayMatch[3]) {
      const hour = parseInt(dayMatch[3]);
      const isPM = dayMatch[4]?.toLowerCase() === 'pm';
      const adjustedHour = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
      reminderTime.setHours(adjustedHour, 0, 0, 0);
    } else {
      reminderTime.setHours(9, 0, 0, 0); // Default to 9am
    }
    
    return { reminderTime, relativeToDeadline: false, hoursBefore: null };
  }
  
  return { reminderTime: null, relativeToDeadline: false, hoursBefore: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { actionId, reminderText }: ReminderRequest = await req.json();

    console.log('Processing reminder request:', { actionId, reminderText, userId: user.id });

    // Get the action item
    const { data: action, error: actionError } = await supabase
      .from('action_items')
      .select('*, meeting:meetings(title)')
      .eq('id', actionId)
      .single();

    if (actionError || !action) {
      throw new Error('Action item not found');
    }

    // Parse the reminder time
    const { reminderTime, relativeToDeadline, hoursBefore } = parseReminderTime(reminderText);

    let finalReminderTime: Date | null = null;

    if (relativeToDeadline && hoursBefore !== null) {
      // Calculate reminder time based on due date
      if (!action.due_date) {
        throw new Error('Cannot set reminder relative to deadline - no due date set');
      }
      
      const dueDate = new Date(action.due_date);
      finalReminderTime = new Date(dueDate.getTime() - (hoursBefore * 60 * 60 * 1000));
    } else {
      finalReminderTime = reminderTime;
    }

    if (!finalReminderTime) {
      throw new Error('Could not parse reminder time from: ' + reminderText);
    }

    // Store reminder in action_items metadata or create a notification
    const { error: updateError } = await supabase
      .from('action_items')
      .update({
        metadata: {
          ...(action.metadata || {}),
          reminder: {
            time: finalReminderTime.toISOString(),
            text: reminderText,
            created_at: new Date().toISOString(),
            created_by: user.id,
          }
        }
      })
      .eq('id', actionId);

    if (updateError) {
      throw updateError;
    }

    // Create a notification entry for the reminder
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Task Reminder Set',
        message: `Reminder set for "${action.title}" at ${finalReminderTime.toLocaleString()}`,
        type: 'reminder_set',
        related_entity_type: 'action_item',
        related_entity_id: actionId,
      });

    if (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    console.log('Reminder set successfully:', {
      actionId,
      reminderTime: finalReminderTime.toISOString(),
      relativeToDeadline,
      hoursBefore,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reminderTime: finalReminderTime.toISOString(),
        message: `Reminder set for ${finalReminderTime.toLocaleString()}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error setting reminder:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
