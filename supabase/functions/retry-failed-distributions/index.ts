import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate next retry time with exponential backoff
function calculateNextRetry(retryCount: number): Date {
  // Exponential backoff: 2^retryCount minutes
  // Retry 1: 2 min, Retry 2: 4 min, Retry 3: 8 min
  const delayMinutes = Math.pow(2, retryCount);
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
  return nextRetry;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔄 Starting retry process for failed distributions...");

    // Find retry items that are due
    const { data: retryItems, error: retryError } = await supabase
      .from("distribution_retry_queue")
      .select(`
        *,
        distribution_history!inner(
          meeting_id,
          pdf_generation_id
        )
      `)
      .in("status", ["pending", "retrying"])
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(20);

    if (retryError) throw retryError;

    // Filter items where retry_count < max_retries
    const itemsToRetry = (retryItems || []).filter(
      (item) => item.retry_count < item.max_retries
    );

    if (!itemsToRetry || itemsToRetry.length === 0) {
      console.log("✓ No items to retry at this time");
      return new Response(
        JSON.stringify({ success: true, message: "No items to retry", retriedCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📋 Found ${itemsToRetry.length} items to retry`);

    let successCount = 0;
    let failedCount = 0;

    for (const item of itemsToRetry) {
      try {
        console.log(`🔄 Retrying distribution ${item.id} (attempt ${item.retry_count + 1}/${item.max_retries})`);

        // Mark as retrying
        await supabase
          .from("distribution_retry_queue")
          .update({ status: "retrying", last_retry_at: new Date().toISOString() })
          .eq("id", item.id);

        const failedRecipients = Array.isArray(item.failed_recipients) 
          ? item.failed_recipients 
          : [];

        if (failedRecipients.length === 0) {
          console.log(`⚠️ No failed recipients for ${item.id}, marking as completed`);
          await supabase
            .from("distribution_retry_queue")
            .update({ status: "completed" })
            .eq("id", item.id);
          continue;
        }

        // Retry distribution
        const { data: distData, error: distError } = await supabase.functions.invoke("distribute-pdf", {
          body: {
            pdf_generation_id: item.distribution_history.pdf_generation_id,
            custom_recipients: failedRecipients.map((r: any) => r.email),
          },
        });

        if (distError) throw distError;

        const results = distData?.results || [];
        const nowSuccessful = results.filter((r: any) => r.status === "sent");
        const stillFailed = results.filter((r: any) => r.status === "failed");

        console.log(`✓ Retry result: ${nowSuccessful.length} sent, ${stillFailed.length} still failed`);

        // Update distribution history with retry results
        const { data: originalHistory } = await supabase
          .from("distribution_history")
          .select("*")
          .eq("id", item.distribution_history_id)
          .single();

        if (originalHistory) {
          const updatedRecipientDetails = Array.isArray(originalHistory.recipient_details)
            ? [...originalHistory.recipient_details]
            : [];

          // Update status for successfully sent recipients
          nowSuccessful.forEach((r: any) => {
            const index = updatedRecipientDetails.findIndex((d: any) => d.email === r.email);
            if (index >= 0) {
              updatedRecipientDetails[index] = { ...r, retried: true };
            }
          });

          const newSuccessCount = originalHistory.successful_count + nowSuccessful.length;
          const newFailedCount = originalHistory.failed_count - nowSuccessful.length;
          const newStatus = newFailedCount === 0 ? "success" : newSuccessCount > 0 ? "partial" : "failed";

          await supabase
            .from("distribution_history")
            .update({
              successful_count: newSuccessCount,
              failed_count: newFailedCount,
              status: newStatus,
              recipient_details: updatedRecipientDetails,
            })
            .eq("id", item.distribution_history_id);
        }

        if (stillFailed.length === 0) {
          // All retries succeeded
          await supabase
            .from("distribution_retry_queue")
            .update({
              status: "completed",
              retry_count: item.retry_count + 1,
              failed_recipients: [],
            })
            .eq("id", item.id);
          
          successCount++;
          console.log(`✅ All recipients now successful for ${item.id}`);
        } else if (item.retry_count + 1 >= item.max_retries) {
          // Max retries reached, send failure notification
          await supabase
            .from("distribution_retry_queue")
            .update({
              status: "failed",
              retry_count: item.retry_count + 1,
              failed_recipients: stillFailed,
              last_error: `Max retries (${item.max_retries}) reached`,
            })
            .eq("id", item.id);

          // Create notification for failure
          const { data: meeting } = await supabase
            .from("meetings")
            .select("title, created_by")
            .eq("id", item.meeting_id)
            .single();

          if (meeting) {
            await supabase.from("notifications").insert({
              user_id: meeting.created_by,
              type: "distribution_failed",
              title: "Distribution Failed",
              message: `Distribution for "${meeting.title}" failed after ${item.max_retries} retries. ${stillFailed.length} recipient(s) could not be reached.`,
              metadata: {
                meeting_id: item.meeting_id,
                distribution_history_id: item.distribution_history_id,
                failed_recipients: stillFailed,
              },
            });
          }

          failedCount++;
          console.log(`❌ Max retries reached for ${item.id}, sending failure notification`);
        } else {
          // Schedule next retry
          const nextRetry = calculateNextRetry(item.retry_count + 1);
          await supabase
            .from("distribution_retry_queue")
            .update({
              status: "pending",
              retry_count: item.retry_count + 1,
              failed_recipients: stillFailed,
              next_retry_at: nextRetry.toISOString(),
            })
            .eq("id", item.id);

          console.log(`⏳ Scheduled next retry for ${item.id} at ${nextRetry.toISOString()}`);
        }
      } catch (error: any) {
        console.error(`Error retrying ${item.id}:`, error);
        
        // Update retry queue with error
        if (item.retry_count + 1 >= item.max_retries) {
          await supabase
            .from("distribution_retry_queue")
            .update({
              status: "failed",
              retry_count: item.retry_count + 1,
              last_error: error.message,
            })
            .eq("id", item.id);
          failedCount++;
        } else {
          const nextRetry = calculateNextRetry(item.retry_count + 1);
          await supabase
            .from("distribution_retry_queue")
            .update({
              status: "pending",
              retry_count: item.retry_count + 1,
              next_retry_at: nextRetry.toISOString(),
              last_error: error.message,
            })
            .eq("id", item.id);
        }
      }
    }

    console.log(`✅ Retry process completed: ${successCount} succeeded, ${failedCount} failed permanently`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${itemsToRetry.length} retry items`,
        successCount,
        failedCount,
        totalProcessed: itemsToRetry.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in retry-failed-distributions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
