import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflow_id, trigger_data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflow_id)
      .single();

    if (workflowError || !workflow) {
      throw new Error("Workflow not found");
    }

    if (!workflow.is_active) {
      throw new Error("Workflow is not active");
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id,
        trigger_data,
        status: "running",
      })
      .select()
      .single();

    if (execError) throw execError;

    try {
      // Execute each action
      for (const action of workflow.actions || []) {
        await executeAction(supabase, action, trigger_data, workflow.user_id);
      }

      // Mark as completed
      await supabase
        .from("workflow_executions")
        .update({ status: "completed" })
        .eq("id", execution.id);

      return new Response(
        JSON.stringify({
          success: true,
          execution_id: execution.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (actionError: any) {
      // Mark as failed
      await supabase
        .from("workflow_executions")
        .update({
          status: "failed",
          error_message: actionError.message,
        })
        .eq("id", execution.id);

      throw actionError;
    }
  } catch (error: any) {
    console.error("Workflow execution error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function executeAction(
  supabase: any,
  action: any,
  triggerData: any,
  userId: string
) {
  const { type, config } = action;

  switch (type) {
    case "send_email":
      await supabase.functions.invoke("send-notification-email", {
        body: {
          recipient: config.recipient || triggerData.user_email,
          subject: config.subject,
          message: config.message,
        },
      });
      break;

    case "send_whatsapp":
      await supabase.functions.invoke("send-whatsapp-reminder", {
        body: {
          phone: config.phone || triggerData.user_phone,
          message: config.message,
          type: "custom",
        },
      });
      break;

    case "create_task":
      await supabase.from("action_items").insert({
        title: config.title,
        description: config.description,
        meeting_id: triggerData.meeting_id,
        assigned_to: config.assigned_to || userId,
        created_by: userId,
        due_date: config.due_date,
        priority: config.priority || "medium",
      });
      break;

    case "voice_call":
      await supabase.functions.invoke("initiate-call", {
        body: {
          recipient_phone: config.phone || triggerData.user_phone,
          message: config.message,
          meeting_id: triggerData.meeting_id,
        },
      });
      break;

    case "sync_crm":
      // Sync to configured CRM
      const { data: crmConfig } = await supabase
        .from("crm_integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (crmConfig) {
        const functionMap: Record<string, string> = {
          hubspot: "hubspot-sync",
          salesforce: "salesforce-sync",
          pipedrive: "pipedrive-sync",
        };

        const functionName = functionMap[crmConfig.provider];
        if (functionName) {
          await supabase.functions.invoke(functionName, {
            body: { meeting_id: triggerData.meeting_id },
          });
        }
      }
      break;

    case "upload_drive":
      // Upload to configured storage
      const { data: storageConfig } = await supabase
        .from("document_storage_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("auto_upload", true);

      for (const storage of storageConfig || []) {
        if (storage.provider === "google_drive") {
          await supabase.functions.invoke("google-drive-upload", {
            body: {
              meeting_id: triggerData.meeting_id,
              folder_path: storage.folder_path,
            },
          });
        } else if (storage.provider === "teledrive") {
          await supabase.functions.invoke("teledrive-upload", {
            body: {
              meeting_id: triggerData.meeting_id,
              folder_path: storage.folder_path,
            },
          });
        }
      }
      break;

    default:
      console.log(`Unknown action type: ${type}`);
  }
}