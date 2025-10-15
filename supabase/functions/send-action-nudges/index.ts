import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting action nudge job...");

    // Get actions that need nudges (due within 3 days, not completed, not nudged in last 24 hours)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: actions, error: actionsError } = await supabase
      .from("action_items")
      .select(`
        id,
        title,
        description,
        due_date,
        priority,
        status,
        status_detail,
        eta,
        assigned_to,
        meeting_id,
        last_nudge_sent,
        meetings!inner (
          title
        )
      `)
      .neq("status", "completed")
      .lte("due_date", threeDaysFromNow.toISOString())
      .or(`last_nudge_sent.is.null,last_nudge_sent.lt.${oneDayAgo.toISOString()}`);

    if (actionsError) throw actionsError;

    if (!actions || actions.length === 0) {
      console.log("No actions need nudges");
      return new Response(JSON.stringify({ message: "No actions to nudge" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${actions.length} actions to nudge`);

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (smtpError || !smtpSettings) {
      console.error("No active SMTP settings found");
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get assignee details
    const assigneeIds = [...new Set(actions.map(a => a.assigned_to))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", assigneeIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Send nudges
    const client = new SMTPClient({
      connection: {
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        tls: smtpSettings.use_tls,
        auth: {
          username: smtpSettings.username,
          password: smtpSettings.password,
        },
      },
    });

    let sentCount = 0;

    for (const action of actions) {
      const assignee = profileMap.get(action.assigned_to);
      if (!assignee?.email) continue;

      const daysUntilDue = Math.ceil(
        (new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      const statusUpdateUrl = `${supabaseUrl}/action-status?action=${action.id}`;

      const emailBody = `
        <h2>Action Item Reminder</h2>
        <p>Hi ${assignee.full_name || "there"},</p>
        <p>This is a reminder about your action item:</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${action.title}</h3>
          ${action.description ? `<p>${action.description}</p>` : ""}
          <p><strong>Meeting:</strong> ${(action.meetings as any)?.title || "N/A"}</p>
          <p><strong>Due Date:</strong> ${new Date(action.due_date).toLocaleDateString()} (${daysUntilDue} days)</p>
          <p><strong>Priority:</strong> ${action.priority}</p>
          ${action.eta ? `<p><strong>Current ETA:</strong> ${new Date(action.eta).toLocaleDateString()}</p>` : ""}
        </div>

        <p><strong>Quick Status Update:</strong></p>
        <div style="margin: 20px 0;">
          <a href="${statusUpdateUrl}&status=on_track" style="display: inline-block; padding: 10px 20px; margin: 5px; background: #22c55e; color: white; text-decoration: none; border-radius: 5px;">✓ On Track</a>
          <a href="${statusUpdateUrl}&status=blocked" style="display: inline-block; padding: 10px 20px; margin: 5px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px;">⚠ Blocked</a>
          <a href="${statusUpdateUrl}&status=done" style="display: inline-block; padding: 10px 20px; margin: 5px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">✓ Done</a>
        </div>

        <p>Please update your status or provide an ETA by clicking one of the buttons above.</p>
      `;

      try {
        await client.send({
          from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
          to: assignee.email,
          subject: `Action Reminder: ${action.title} (${daysUntilDue} days until due)`,
          html: emailBody,
        });

        // Log notification
        await supabase.from("notification_log").insert({
          notification_type: "action_nudge",
          recipient_email: assignee.email,
          subject: `Action Reminder: ${action.title}`,
          action_id: action.id,
          meeting_id: action.meeting_id,
          metadata: { days_until_due: daysUntilDue },
        });

        // Update last nudge sent
        await supabase
          .from("action_items")
          .update({ last_nudge_sent: new Date().toISOString() })
          .eq("id", action.id);

        sentCount++;
        console.log(`Sent nudge to ${assignee.email} for action ${action.id}`);
      } catch (error) {
        console.error(`Failed to send nudge for action ${action.id}:`, error);
      }
    }

    await client.close();

    console.log(`Sent ${sentCount} nudges`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${sentCount} action nudges`,
        actions_processed: actions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-action-nudges:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
