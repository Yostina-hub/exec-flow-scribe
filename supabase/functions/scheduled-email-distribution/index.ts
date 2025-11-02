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

    // Find meetings that are ready for distribution but haven't been distributed yet
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select(`
        *,
        meeting_attendees(user_id, users(email))
      `)
      .eq("status", "completed")
      .eq("workflow_stage", "signed_off")
      .is("distributed_at", null)
      .limit(10);

    if (meetingsError) throw meetingsError;

    let distributedCount = 0;

    for (const meeting of meetings || []) {
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

        // Extract attendee emails
        const attendeeEmails = meeting.meeting_attendees
          ?.map((att: any) => att.users?.email)
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
