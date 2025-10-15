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

    console.log("Starting escalation check job...");

    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // Get actions that need escalation (due within 2 days, not done, blocked or at risk)
    const { data: atRiskActions, error: actionsError } = await supabase
      .from("action_items")
      .select(`
        id,
        title,
        description,
        due_date,
        priority,
        status,
        status_detail,
        escalation_level,
        escalated_at,
        assigned_to,
        created_by,
        meeting_id,
        meetings!inner (
          title
        )
      `)
      .neq("status", "completed")
      .lte("due_date", twoDaysFromNow.toISOString())
      .or("status_detail.eq.blocked,status_detail.is.null");

    if (actionsError) throw actionsError;

    if (!atRiskActions || atRiskActions.length === 0) {
      console.log("No actions need escalation");
      return new Response(
        JSON.stringify({ message: "No actions to escalate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${atRiskActions.length} at-risk actions`);

    // Get escalation config
    const { data: escalationConfig } = await supabase
      .from("escalation_config")
      .select("*");

    const cosConfig = escalationConfig?.find(c => c.role_type === "chief_of_staff");
    const ceoConfig = escalationConfig?.find(c => c.role_type === "ceo");

    // Get SMTP settings
    const { data: smtpSettings } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!smtpSettings) {
      console.error("No active SMTP settings found");
      return new Response(
        JSON.stringify({ error: "SMTP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let escalatedCount = 0;

    for (const action of atRiskActions) {
      const daysUntilDue = Math.ceil(
        (new Date(action.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let shouldEscalate = false;
      let escalateTo = null;
      let newEscalationLevel = action.escalation_level;

      // Determine escalation level
      if (action.status_detail === "blocked") {
        // Blocked actions escalate immediately
        shouldEscalate = true;
        newEscalationLevel = 1;
        escalateTo = cosConfig?.user_id;
      } else if (daysUntilDue <= 1 && action.escalation_level === 0) {
        // First escalation to Chief of Staff
        shouldEscalate = true;
        newEscalationLevel = 1;
        escalateTo = cosConfig?.user_id;
      } else if (daysUntilDue <= 0 && action.escalation_level === 1) {
        // Second escalation to CEO
        shouldEscalate = true;
        newEscalationLevel = 2;
        escalateTo = ceoConfig?.user_id;
      }

      if (!shouldEscalate || !escalateTo) continue;

      // Get escalation recipient email
      const { data: recipient } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", escalateTo)
        .single();

      if (!recipient?.email) continue;

      // Get assignee details
      const { data: assignee } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", action.assigned_to)
        .single();

      const escalationTitle = newEscalationLevel === 1 ? "Chief of Staff" : "CEO";
      const emailBody = `
        <h2>Action Item Escalation - ${escalationTitle}</h2>
        <p>An action item requires your attention:</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">${action.title}</h3>
          ${action.description ? `<p>${action.description}</p>` : ""}
          <p><strong>Meeting:</strong> ${(action.meetings as any)?.title || "N/A"}</p>
          <p><strong>Assigned to:</strong> ${assignee?.full_name || "Unknown"} (${assignee?.email})</p>
          <p><strong>Due Date:</strong> ${new Date(action.due_date).toLocaleDateString()} (${daysUntilDue} days)</p>
          <p><strong>Priority:</strong> ${action.priority}</p>
          <p><strong>Status:</strong> ${action.status_detail || action.status}</p>
          ${action.status_detail === "blocked" ? `<p><strong>⚠️ BLOCKED</strong></p>` : ""}
        </div>

        <p><strong>Escalation Reason:</strong></p>
        <p>${action.status_detail === "blocked" 
          ? "This action is marked as blocked and needs immediate attention." 
          : daysUntilDue <= 0 
            ? "This action is overdue and has not been completed." 
            : "This action is at risk of missing its deadline."
        }</p>

        <p>Please follow up with the action owner to resolve this issue.</p>
      `;

      try {
        await client.send({
          from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
          to: recipient.email,
          subject: `⚠️ Action Escalation: ${action.title}`,
          html: emailBody,
        });

        // Update action with escalation info
        await supabase
          .from("action_items")
          .update({
            escalation_level: newEscalationLevel,
            escalated_to: escalateTo,
            escalated_at: now.toISOString(),
          })
          .eq("id", action.id);

        // Log notification
        await supabase.from("notification_log").insert({
          notification_type: `escalation_level_${newEscalationLevel}`,
          recipient_email: recipient.email,
          subject: `Action Escalation: ${action.title}`,
          action_id: action.id,
          meeting_id: action.meeting_id,
          metadata: { 
            escalation_level: newEscalationLevel,
            days_until_due: daysUntilDue,
            status_detail: action.status_detail 
          },
        });

        escalatedCount++;
        console.log(`Escalated action ${action.id} to ${escalationTitle}`);
      } catch (error) {
        console.error(`Failed to escalate action ${action.id}:`, error);
      }
    }

    await client.close();

    console.log(`Escalated ${escalatedCount} actions`);

    return new Response(
      JSON.stringify({ 
        message: `Escalated ${escalatedCount} actions`,
        actions_checked: atRiskActions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-escalations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
