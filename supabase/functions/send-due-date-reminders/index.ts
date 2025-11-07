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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for due date reminders...");

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

    // Find tasks due in 24 hours (within 1 hour window to account for cron timing)
    const { data: tasks24h } = await supabase
      .from("action_items")
      .select("*, assignee:profiles!action_items_assigned_to_fkey(id, full_name, email)")
      .gte("due_date", now.toISOString())
      .lte("due_date", in24Hours.toISOString())
      .neq("status", "completed");

    // Find tasks due in 1 hour (within 5 minute window)
    const { data: tasks1h } = await supabase
      .from("action_items")
      .select("*, assignee:profiles!action_items_assigned_to_fkey(id, full_name, email)")
      .gte("due_date", now.toISOString())
      .lte("due_date", in1Hour.toISOString())
      .neq("status", "completed");

    // Find overdue tasks
    const { data: overdueTasks } = await supabase
      .from("action_items")
      .select("*, assignee:profiles!action_items_assigned_to_fkey(id, full_name, email)")
      .lt("due_date", now.toISOString())
      .neq("status", "completed");

    const results = {
      reminders_24h: 0,
      reminders_1h: 0,
      escalations: 0,
      errors: [] as string[],
    };

    // Process 24-hour reminders
    for (const task of tasks24h || []) {
      try {
        // Check if we already sent a 24h reminder for this task
        const { data: existingLog } = await supabase
          .from("guba_notification_log")
          .select("id")
          .eq("task_id", task.id)
          .eq("notification_type", "due_date_24h")
          .eq("status", "sent")
          .maybeSingle();

        if (existingLog) {
          console.log(`Already sent 24h reminder for task ${task.id}`);
          continue;
        }

        // Get user preferences
        const { data: prefs } = await supabase
          .from("guba_notification_preferences")
          .select("*")
          .eq("user_id", task.assigned_to)
          .maybeSingle();

        if (prefs && !prefs.due_date_24h) {
          console.log(`User ${task.assigned_to} has disabled 24h reminders`);
          continue;
        }

        await supabase.functions.invoke("send-task-notification", {
          body: {
            task_id: task.id,
            user_id: task.assigned_to,
            notification_type: "due_date_24h",
          },
        });

        results.reminders_24h++;
      } catch (error: any) {
        console.error(`Error sending 24h reminder for task ${task.id}:`, error);
        results.errors.push(`24h-${task.id}: ${error.message}`);
      }
    }

    // Process 1-hour reminders
    for (const task of tasks1h || []) {
      try {
        // Check if we already sent a 1h reminder for this task
        const { data: existingLog } = await supabase
          .from("guba_notification_log")
          .select("id")
          .eq("task_id", task.id)
          .eq("notification_type", "due_date_1h")
          .eq("status", "sent")
          .maybeSingle();

        if (existingLog) {
          console.log(`Already sent 1h reminder for task ${task.id}`);
          continue;
        }

        // Get user preferences
        const { data: prefs } = await supabase
          .from("guba_notification_preferences")
          .select("*")
          .eq("user_id", task.assigned_to)
          .maybeSingle();

        if (prefs && !prefs.due_date_1h) {
          console.log(`User ${task.assigned_to} has disabled 1h reminders`);
          continue;
        }

        await supabase.functions.invoke("send-task-notification", {
          body: {
            task_id: task.id,
            user_id: task.assigned_to,
            notification_type: "due_date_1h",
          },
        });

        results.reminders_1h++;
      } catch (error: any) {
        console.error(`Error sending 1h reminder for task ${task.id}:`, error);
        results.errors.push(`1h-${task.id}: ${error.message}`);
      }
    }

    // Process overdue escalations (send daily)
    for (const task of overdueTasks || []) {
      try {
        // Check if we sent an escalation in the last 24 hours
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const { data: recentLog } = await supabase
          .from("guba_notification_log")
          .select("id")
          .eq("task_id", task.id)
          .eq("notification_type", "overdue_escalation")
          .eq("status", "sent")
          .gte("sent_at", yesterday.toISOString())
          .maybeSingle();

        if (recentLog) {
          console.log(`Already sent recent escalation for task ${task.id}`);
          continue;
        }

        // Get user preferences
        const { data: prefs } = await supabase
          .from("guba_notification_preferences")
          .select("*")
          .eq("user_id", task.assigned_to)
          .maybeSingle();

        if (prefs && !prefs.overdue_escalation) {
          console.log(`User ${task.assigned_to} has disabled escalations`);
          continue;
        }

        await supabase.functions.invoke("send-task-notification", {
          body: {
            task_id: task.id,
            user_id: task.assigned_to,
            notification_type: "overdue_escalation",
          },
        });

        results.escalations++;
      } catch (error: any) {
        console.error(`Error sending escalation for task ${task.id}:`, error);
        results.errors.push(`overdue-${task.id}: ${error.message}`);
      }
    }

    console.log("Due date reminders completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-due-date-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
