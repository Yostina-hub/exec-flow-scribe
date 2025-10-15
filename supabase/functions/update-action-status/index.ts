import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

    // Parse query params from URL
    const url = new URL(req.url);
    const actionId = url.searchParams.get("action");
    const status = url.searchParams.get("status") as "on_track" | "blocked" | "done" | null;
    const eta = url.searchParams.get("eta");
    const blockedReason = url.searchParams.get("reason");

    if (!actionId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing action ID or status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating action ${actionId} to status: ${status}`);

    // Get current action
    const { data: action, error: fetchError } = await supabase
      .from("action_items")
      .select("*")
      .eq("id", actionId)
      .single();

    if (fetchError || !action) {
      return new Response(
        JSON.stringify({ error: "Action not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare update data
    const updateData: any = {
      status_detail: status,
    };

    if (status === "done") {
      updateData.status = "completed";
      updateData.completed_at = new Date().toISOString();
    }

    if (eta) {
      updateData.eta = new Date(eta).toISOString();
    }

    if (status === "blocked" && blockedReason) {
      updateData.blocked_reason = blockedReason;
    }

    // If status changes from blocked to on_track or done, reset escalation
    if (action.status_detail === "blocked" && status !== "blocked") {
      updateData.escalation_level = 0;
      updateData.escalated_to = null;
      updateData.escalated_at = null;
    }

    // Update action
    const { error: updateError } = await supabase
      .from("action_items")
      .update(updateData)
      .eq("id", actionId);

    if (updateError) throw updateError;

    // Log status update
    await supabase.from("action_status_updates").insert({
      action_id: actionId,
      user_id: action.assigned_to,
      old_status: action.status,
      new_status: updateData.status || action.status,
      old_status_detail: action.status_detail,
      new_status_detail: status,
      eta: updateData.eta,
      comment: blockedReason || null,
    });

    // Return success HTML page
    const statusEmoji = {
      on_track: "✅",
      blocked: "⚠️",
      done: "🎉",
    }[status];

    const statusColor = {
      on_track: "#22c55e",
      blocked: "#ef4444",
      done: "#3b82f6",
    }[status];

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Status Updated</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 500px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #1f2937;
              margin: 0 0 10px 0;
            }
            p {
              color: #6b7280;
              margin: 0 0 30px 0;
            }
            .status {
              display: inline-block;
              padding: 8px 16px;
              background: ${statusColor};
              color: white;
              border-radius: 6px;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">${statusEmoji}</div>
            <h1>Status Updated!</h1>
            <p>Your action item status has been successfully updated to:</p>
            <div class="status">${status.replace("_", " ")}</div>
            <p style="margin-top: 30px; font-size: 14px;">
              You can close this window now.
            </p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
      },
    });
  } catch (error: any) {
    console.error("Error updating action status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
