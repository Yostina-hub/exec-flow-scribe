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

    console.log("Starting weekly progress rollup...");

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get CEO config
    const { data: ceoConfig } = await supabase
      .from("escalation_config")
      .select("user_id")
      .eq("role_type", "ceo")
      .single();

    if (!ceoConfig?.user_id) {
      console.error("No CEO configured");
      return new Response(
        JSON.stringify({ error: "CEO not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: ceoProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", ceoConfig.user_id)
      .single();

    if (!ceoProfile?.email) {
      console.error("CEO email not found");
      return new Response(
        JSON.stringify({ error: "CEO email not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get action statistics
    const { data: allActions } = await supabase
      .from("action_items")
      .select("id, status, status_detail, priority, due_date, completed_at");

    const { data: closedThisWeek } = await supabase
      .from("action_items")
      .select("id")
      .eq("status", "completed")
      .gte("completed_at", oneWeekAgo.toISOString());

    const { data: overdue } = await supabase
      .from("action_items")
      .select("id, title, due_date, assigned_to")
      .neq("status", "completed")
      .lt("due_date", now.toISOString());

    const { data: atRisk } = await supabase
      .from("action_items")
      .select("id, title, due_date, status_detail")
      .neq("status", "completed")
      .or("status_detail.eq.blocked,escalation_level.gt.0");

    const { data: decisionsThisWeek } = await supabase
      .from("decisions")
      .select("id, decision_text, timestamp, meetings(title)")
      .gte("timestamp", oneWeekAgo.toISOString());

    const { data: upcomingMeetings } = await supabase
      .from("meetings")
      .select("id, title, start_time")
      .gte("start_time", now.toISOString())
      .lte("start_time", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true });

    // Calculate statistics
    const totalActions = allActions?.length || 0;
    const closedCount = closedThisWeek?.length || 0;
    const overdueCount = overdue?.length || 0;
    const atRiskCount = atRisk?.length || 0;
    const completionRate = totalActions > 0 ? Math.round((closedCount / totalActions) * 100) : 0;

    // Build email
    const emailBody = `
      <h1>Weekly Progress Report</h1>
      <p>Hi ${ceoProfile.full_name || "CEO"},</p>
      <p>Here's your weekly progress summary for ${oneWeekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}:</p>

      <h2>📊 Action Items Summary</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px;"><strong>Total Active Actions:</strong></td>
            <td style="padding: 10px; text-align: right;">${totalActions}</td>
          </tr>
          <tr style="background: #dcfce7;">
            <td style="padding: 10px;"><strong>✅ Closed This Week:</strong></td>
            <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: bold;">${closedCount}</td>
          </tr>
          <tr style="background: #fee2e2;">
            <td style="padding: 10px;"><strong>⚠️ Overdue:</strong></td>
            <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: bold;">${overdueCount}</td>
          </tr>
          <tr style="background: #fef3c7;">
            <td style="padding: 10px;"><strong>🔶 At Risk:</strong></td>
            <td style="padding: 10px; text-align: right; color: #d97706; font-weight: bold;">${atRiskCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px;"><strong>Completion Rate:</strong></td>
            <td style="padding: 10px; text-align: right; font-weight: bold;">${completionRate}%</td>
          </tr>
        </table>
      </div>

      ${overdueCount > 0 ? `
        <h2>⚠️ Overdue Actions (${overdueCount})</h2>
        <ul>
          ${overdue?.slice(0, 5).map(a => `<li>${a.title} - Due: ${new Date(a.due_date).toLocaleDateString()}</li>`).join("")}
          ${overdueCount > 5 ? `<li><em>...and ${overdueCount - 5} more</em></li>` : ""}
        </ul>
      ` : ""}

      ${atRiskCount > 0 ? `
        <h2>🔶 At-Risk Actions (${atRiskCount})</h2>
        <ul>
          ${atRisk?.slice(0, 5).map(a => `<li>${a.title} - ${a.status_detail === "blocked" ? "🚫 BLOCKED" : "At Risk"}</li>`).join("")}
          ${atRiskCount > 5 ? `<li><em>...and ${atRiskCount - 5} more</em></li>` : ""}
        </ul>
      ` : ""}

      <h2>📋 Recent Decisions (${decisionsThisWeek?.length || 0})</h2>
      ${decisionsThisWeek && decisionsThisWeek.length > 0 ? `
        <ul>
          ${decisionsThisWeek.slice(0, 5).map(d => `
            <li>
              <strong>${d.decision_text}</strong><br/>
              <small>Meeting: ${(d.meetings as any)?.title || "N/A"} - ${new Date(d.timestamp).toLocaleDateString()}</small>
            </li>
          `).join("")}
          ${decisionsThisWeek.length > 5 ? `<li><em>...and ${decisionsThisWeek.length - 5} more</em></li>` : ""}
        </ul>
      ` : "<p>No new decisions this week.</p>"}

      <h2>📅 Upcoming Meetings (Next 7 Days)</h2>
      ${upcomingMeetings && upcomingMeetings.length > 0 ? `
        <ul>
          ${upcomingMeetings.map(m => `
            <li><strong>${m.title}</strong> - ${new Date(m.start_time).toLocaleString()}</li>
          `).join("")}
        </ul>
      ` : "<p>No meetings scheduled for next week.</p>"}

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;"/>
      <p style="color: #6b7280; font-size: 12px;">
        This is an automated weekly summary generated by your Meeting Minutes system.
      </p>
    `;

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

    await client.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: ceoProfile.email,
      subject: `📊 Weekly Progress Report - ${now.toLocaleDateString()}`,
      html: emailBody,
    });

    await client.close();

    // Log notification
    await supabase.from("notification_log").insert({
      notification_type: "weekly_rollup",
      recipient_email: ceoProfile.email,
      subject: "Weekly Progress Report",
      metadata: {
        total_actions: totalActions,
        closed_count: closedCount,
        overdue_count: overdueCount,
        at_risk_count: atRiskCount,
        completion_rate: completionRate,
      },
    });

    console.log(`Weekly rollup sent to ${ceoProfile.email}`);

    return new Response(
      JSON.stringify({ 
        message: "Weekly progress rollup sent",
        recipient: ceoProfile.email,
        stats: {
          total_actions: totalActions,
          closed: closedCount,
          overdue: overdueCount,
          at_risk: atRiskCount,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in weekly-progress-rollup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
