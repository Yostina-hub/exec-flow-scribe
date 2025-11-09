import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find schedules that are due to be sent
    const { data: schedules, error: schedulesError } = await supabase
      .from("distribution_schedules")
      .select(`
        id,
        meeting_id,
        schedule_type,
        recurrence_pattern,
        meetings!inner(
          id,
          title,
          description,
          scheduled_at,
          created_by,
          minutes_pdf_url
        )
      `)
      .eq("enabled", true)
      .lte("next_send_at", new Date().toISOString())
      .limit(10);

    if (schedulesError) throw schedulesError;

    let distributedCount = 0;

    for (const schedule of schedules || []) {
      const meeting = schedule.meetings as any;
      try {
        // Get SMTP settings for the meeting creator
        const { data: smtpSettings } = await supabase
          .from("smtp_settings")
          .select("*")
          .eq("user_id", meeting.created_by)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!smtpSettings) {
          console.log(`No SMTP settings for meeting ${meeting.id}, skipping`);
          continue;
        }

        // Get attendee emails separately
        const { data: attendees } = await supabase
          .from("meeting_attendees")
          .select("profiles(email)")
          .eq("meeting_id", meeting.id);

        const attendeeEmails = attendees
          ?.map((att: any) => att.profiles?.email)
          .filter(Boolean) || [];

        if (attendeeEmails.length === 0) {
          console.log(`No attendees for meeting ${meeting.id}, skipping`);
          continue;
        }

        // Create SMTP client
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

        const subject = `Meeting Minutes: ${meeting.title}`;
        const html = `
          <h2>Meeting Minutes</h2>
          <p><strong>Meeting:</strong> ${meeting.title}</p>
          <p><strong>Date:</strong> ${new Date(meeting.scheduled_at).toLocaleDateString()}</p>
          <p><strong>Description:</strong> ${meeting.description || 'N/A'}</p>
          ${meeting.minutes_pdf_url ? `<p><a href="${meeting.minutes_pdf_url}">Download Minutes PDF</a></p>` : ''}
          <p>This is an automated distribution of the signed-off meeting minutes.</p>
        `;

        // Send to each attendee
        for (const email of attendeeEmails) {
          await client.send({
            from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
            to: email,
            subject,
            html,
          });
        }

        await client.close();

        // Log distribution
        await supabase.from("email_distributions").insert({
          meeting_id: meeting.id,
          sent_by: meeting.created_by,
          recipients: attendeeEmails,
          subject,
          status: "sent",
        });

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

        await supabase
          .from("distribution_schedules")
          .update(updates)
          .eq("id", schedule.id);

        // Update meeting status
        await supabase
          .from("meetings")
          .update({
            distributed_at: new Date().toISOString(),
          })
          .eq("id", meeting.id);

        distributedCount++;
        console.log(`Distributed minutes for meeting ${meeting.id} to ${attendeeEmails.length} recipients`);
      } catch (error: any) {
        console.error(`Error distributing meeting ${meeting.id}:`, error);
        // Continue with next meeting
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
