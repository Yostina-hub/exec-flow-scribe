import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  task_id: string;
  user_id: string;
  notification_type: "new_assignment" | "due_date_24h" | "due_date_1h" | "status_change" | "overdue_escalation" | "reassignment";
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { task_id, user_id, notification_type, metadata }: NotificationRequest = await req.json();

    console.log("Processing notification:", { task_id, user_id, notification_type });

    // Get user preferences
    const { data: prefs } = await supabase
      .from("guba_notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    // Get task details
    const { data: task } = await supabase
      .from("action_items")
      .select(`
        *,
        assignee:profiles!action_items_assigned_to_fkey(full_name, email),
        creator:profiles!action_items_created_by_fkey(full_name)
      `)
      .eq("id", task_id)
      .single();

    if (!task) {
      throw new Error("Task not found");
    }

    // Get user profile
    const { data: user } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user_id)
      .single();

    if (!user) {
      throw new Error("User not found");
    }

    const channels: string[] = [];
    const notificationData: any = {
      user_id,
      task_id,
      notification_type,
      metadata: metadata || {},
    };

    // Determine which channels to use
    if (prefs?.in_app_enabled !== false) {
      channels.push("in_app");
    }
    if (prefs?.email_enabled) {
      channels.push("email");
    }
    if (prefs?.sms_enabled) {
      channels.push("sms");
    }
    if (prefs?.whatsapp_enabled) {
      channels.push("whatsapp");
    }

    const results = [];

    for (const channel of channels) {
      try {
        if (channel === "email") {
          // Send email notification
          const emailBody = generateEmailBody(notification_type, task, user);
          const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
            body: {
              to: user.email,
              subject: emailBody.subject,
              html: emailBody.html,
            },
          });

          if (emailError) throw emailError;

          // Log successful email
          await supabase.from("guba_notification_log").insert({
            ...notificationData,
            channel: "email",
            status: "sent",
          });

          results.push({ channel: "email", status: "sent" });
        } else if (channel === "in_app") {
          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id,
            title: generateNotificationTitle(notification_type, task),
            message: generateNotificationMessage(notification_type, task),
            type: "task",
            related_id: task_id,
          });

          // Log successful in-app
          await supabase.from("guba_notification_log").insert({
            ...notificationData,
            channel: "in_app",
            status: "sent",
          });

          results.push({ channel: "in_app", status: "sent" });
        } else if (channel === "whatsapp" && user.email) {
          // Send WhatsApp notification
          const { error: whatsappError } = await supabase.functions.invoke("send-whatsapp-reminder", {
            body: {
              to: user.email, // Assuming email maps to phone
              message: generateNotificationMessage(notification_type, task),
            },
          });

          if (whatsappError) throw whatsappError;

          await supabase.from("guba_notification_log").insert({
            ...notificationData,
            channel: "whatsapp",
            status: "sent",
          });

          results.push({ channel: "whatsapp", status: "sent" });
        }
      } catch (error: any) {
        console.error(`Failed to send ${channel} notification:`, error);
        await supabase.from("guba_notification_log").insert({
          ...notificationData,
          channel,
          status: "failed",
          error_message: error.message,
        });

        results.push({ channel, status: "failed", error: error.message });
      }
    }

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
    console.error("Error in send-task-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateNotificationTitle(type: string, task: any): string {
  switch (type) {
    case "new_assignment":
      return "🎯 New Task Assigned";
    case "due_date_24h":
      return "⏰ Task Due Tomorrow";
    case "due_date_1h":
      return "🔔 Task Due in 1 Hour";
    case "status_change":
      return "✅ Task Status Updated";
    case "overdue_escalation":
      return "⚠️ Task Overdue";
    case "reassignment":
      return "🔄 Task Reassigned";
    default:
      return "📋 Task Notification";
  }
}

function generateNotificationMessage(type: string, task: any): string {
  switch (type) {
    case "new_assignment":
      return `You have been assigned: "${task.title}"`;
    case "due_date_24h":
      return `Task "${task.title}" is due tomorrow`;
    case "due_date_1h":
      return `Task "${task.title}" is due in 1 hour!`;
    case "status_change":
      return `Task "${task.title}" status changed to ${task.status}`;
    case "overdue_escalation":
      return `Task "${task.title}" is overdue. Please complete it ASAP.`;
    case "reassignment":
      return `Task "${task.title}" has been reassigned to you`;
    default:
      return `Update for task: "${task.title}"`;
  }
}

function generateEmailBody(type: string, task: any, user: any): { subject: string; html: string } {
  const title = generateNotificationTitle(type, task);
  const message = generateNotificationMessage(type, task);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .task-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .priority-high { border-left-color: #ef4444; }
        .priority-medium { border-left-color: #f59e0b; }
        .priority-low { border-left-color: #10b981; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="content">
          <p>Hi ${user.full_name},</p>
          <p>${message}</p>
          
          <div class="task-card priority-${task.priority}">
            <h3>${task.title}</h3>
            ${task.description ? `<p>${task.description}</p>` : ""}
            <p><strong>Priority:</strong> ${task.priority.toUpperCase()}</p>
            <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${task.status.replace("_", " ").toUpperCase()}</p>
          </div>
          
          <a href="${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")}/actions" class="button">
            View Task
          </a>
          
          <div class="footer">
            <p>This is an automated notification from Guba Task Management System</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: `${title}: ${task.title}`,
    html,
  };
}
