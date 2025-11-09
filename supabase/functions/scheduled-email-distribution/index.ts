import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Find schedules that are due to be sent
    const { data: schedules, error: schedulesError } = await supabaseClient
      .from("distribution_schedules")
      .select("*")
      .eq("enabled", true)
      .lte("next_send_at", new Date().toISOString())
      .limit(10);

    if (schedulesError) throw schedulesError;

    let distributedCount = 0;

    for (const schedule of schedules || []) {
      try {

        // Get attendee emails
        const { data: attendees } = await supabaseClient
          .from("meeting_attendees")
          .select("user:profiles!meeting_attendees_user_id_fkey(email)")
          .eq("meeting_id", schedule.meeting_id);

        const attendeeEmails = attendees
          ?.map((att: any) => att.user?.email)
          .filter(Boolean) || [];

        if (attendeeEmails.length === 0) {
          console.log(`No attendees for meeting ${schedule.meeting_id}, skipping`);
          continue;
        }

        // Get latest minutes version
        const { data: minutesData } = await supabaseClient
          .from('minutes_versions')
          .select('id')
          .eq('meeting_id', schedule.meeting_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!minutesData) {
          console.log(`No minutes found for meeting ${schedule.meeting_id}, skipping`);
          continue;
        }

        // Get default brand kit
        const { data: brandKit } = await supabaseClient
          .from('brand_kits')
          .select('id')
          .eq('is_default', true)
          .limit(1)
          .maybeSingle();

        // Generate PDF
        const { data: pdfData, error: pdfError } = await supabaseClient.functions.invoke('generate-branded-pdf', {
          body: {
            meeting_id: schedule.meeting_id,
            minutes_version_id: minutesData.id,
            brand_kit_id: brandKit?.id,
            include_watermark: false,
          },
        });

        if (pdfError) {
          console.error(`PDF generation error for schedule ${schedule.id}:`, pdfError);
          
          // Log failed generation
          await supabaseClient.from('distribution_history').insert({
            meeting_id: schedule.meeting_id,
            distribution_schedule_id: schedule.id,
            status: 'failed',
            total_recipients: attendeeEmails.length,
            successful_count: 0,
            failed_count: attendeeEmails.length,
            recipient_details: attendeeEmails.map(email => ({ email, status: 'failed', error: 'PDF generation failed' })),
            distribution_type: 'scheduled',
            error_message: pdfError.message,
          });
          continue;
        }

        // Distribute PDF
        const { data: distData, error: distError } = await supabaseClient.functions.invoke('distribute-pdf', {
          body: {
            pdf_generation_id: pdfData.pdf_generation_id,
            custom_recipients: attendeeEmails,
          },
        });

        if (distError) {
          console.error(`Distribution error for schedule ${schedule.id}:`, distError);
          
          // Log failed distribution
          await supabaseClient.from('distribution_history').insert({
            meeting_id: schedule.meeting_id,
            distribution_schedule_id: schedule.id,
            pdf_generation_id: pdfData.pdf_generation_id,
            status: 'failed',
            total_recipients: attendeeEmails.length,
            successful_count: 0,
            failed_count: attendeeEmails.length,
            recipient_details: attendeeEmails.map(email => ({ email, status: 'failed', error: distError.message })),
            distribution_type: 'scheduled',
            error_message: distError.message,
          });
          continue;
        }

        const results = distData?.results || [];
        const sentCount = results.filter((r: any) => r.status === 'sent').length;
        const failedCount = results.filter((r: any) => r.status === 'failed').length;

        // Log distribution
        const { data: historyRecord } = await supabaseClient.from('distribution_history').insert({
          meeting_id: schedule.meeting_id,
          distribution_schedule_id: schedule.id,
          pdf_generation_id: pdfData.pdf_generation_id,
          status: failedCount === 0 ? 'success' : sentCount > 0 ? 'partial' : 'failed',
          total_recipients: attendeeEmails.length,
          successful_count: sentCount,
          failed_count: failedCount,
          recipient_details: results,
          distribution_type: 'scheduled',
        }).select().single();

        // If there are failures, add to retry queue
        if (failedCount > 0 && historyRecord) {
          const failedRecipients = results.filter((r: any) => r.status === 'failed');
          const nextRetry = new Date();
          nextRetry.setMinutes(nextRetry.getMinutes() + 2); // First retry in 2 minutes

          await supabaseClient.from('distribution_retry_queue').insert({
            distribution_history_id: historyRecord.id,
            meeting_id: schedule.meeting_id,
            failed_recipients: failedRecipients,
            next_retry_at: nextRetry.toISOString(),
          });
        }

        console.log(`✓ Successfully distributed to ${sentCount}/${attendeeEmails.length} recipients for schedule ${schedule.id}`);
        // Update schedule
        const now = new Date();
        const updates: any = {
          last_sent_at: now.toISOString(),
        };

        // Calculate next send time for recurring schedules
        if (schedule.schedule_type === 'recurring' && schedule.recurrence_pattern) {
          let nextSend = new Date(now);
          
          switch (schedule.recurrence_pattern) {
            case 'daily':
              nextSend.setDate(nextSend.getDate() + 1);
              break;
            case 'weekly':
              nextSend.setDate(nextSend.getDate() + 7);
              break;
            case 'monthly':
              nextSend.setMonth(nextSend.getMonth() + 1);
              break;
          }
          
          updates.next_send_at = nextSend.toISOString();
        } else {
          // For one-time schedules, disable after sending
          updates.enabled = false;
        }

        await supabaseClient
          .from("distribution_schedules")
          .update(updates)
          .eq("id", schedule.id);

        distributedCount++;
      } catch (error: any) {
        console.error(`Error distributing schedule ${schedule.id}:`, error);
        // Continue with next schedule
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Distributed ${distributedCount} meeting minutes`,
        distributedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in scheduled email distribution:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
