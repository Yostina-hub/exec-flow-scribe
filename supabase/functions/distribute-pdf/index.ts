import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DistributeRequest {
  pdf_generation_id: string;
  distribution_profile_id?: string;
  custom_recipients?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { data: requestData }: { data: DistributeRequest } = await req.json();
    const { pdf_generation_id, distribution_profile_id, custom_recipients } = requestData;

    // Fetch PDF generation record
    const { data: pdfGen, error: pdfError } = await supabase
      .from("pdf_generations")
      .select(`
        *,
        meeting:meetings!pdf_generations_meeting_id_fkey(title),
        minutes_version:minutes_versions!pdf_generations_minutes_version_id_fkey(content)
      `)
      .eq("id", pdf_generation_id)
      .single();

    if (pdfError) throw pdfError;

    // Determine recipients
    let recipients: string[] = [];
    
    if (distribution_profile_id) {
      // Fetch profile and recipients
      const { data: profileRecipients, error: recipError } = await supabase
        .from("distribution_recipients")
        .select(`
          user:profiles!distribution_recipients_user_id_fkey(email)
        `)
        .eq("profile_id", distribution_profile_id);

      if (recipError) throw recipError;

      recipients = profileRecipients
        .map((r: any) => r.user?.email)
        .filter((email: string | undefined): email is string => !!email);

    } else if (custom_recipients) {
      recipients = custom_recipients;
    }

    if (recipients.length === 0) {
      throw new Error("No recipients specified");
    }

    // Fetch SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (smtpError || !smtpSettings) {
      throw new Error("SMTP settings not configured. Please configure SMTP in Settings.");
    }

    // Generate email content
    const meetingTitle = pdfGen.meeting?.title || "Meeting";
    const approvalInfo = pdfGen.approval_stamp as any;

    // Initialize SMTP client
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

    // Send emails using SMTP
    const emailPromises = recipients.map(async (email) => {
      try {
        await client.send({
          from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
          to: email,
          subject: `Meeting Minutes: ${meetingTitle}`,
          content: `
            <h2>Meeting Minutes: ${meetingTitle}</h2>
            <p>The minutes from this meeting are now available.</p>
            
            ${approvalInfo ? `
              <div style="border: 2px solid #0066cc; padding: 15px; margin: 20px 0; background: #f0f8ff;">
                <strong>✓ APPROVED</strong>
                <div>By: ${approvalInfo.approved_by}</div>
                <div>At: ${new Date(approvalInfo.approved_at).toLocaleString()}</div>
                <div style="font-size: 12px; color: #666; margin-top: 10px;">
                  Hash: ${approvalInfo.hash}
                </div>
              </div>
            ` : ''}
            
            ${pdfGen.exhibits_included > 0 ? `
              <p><strong>Includes ${pdfGen.exhibits_included} exhibit(s)</strong></p>
            ` : ''}
            
            <p>
              <a href="${pdfGen.pdf_url}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Download PDF
              </a>
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Generated: ${new Date(pdfGen.generated_at).toLocaleString()}<br>
              ${pdfGen.watermark_applied ? `${pdfGen.watermark_applied}` : ''}
            </p>
          `,
        });
        return { email, status: "sent" };
      } catch (error: any) {
        console.error(`Failed to send to ${email}:`, error);
        return { email, status: "failed", error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const failedCount = results.filter(r => r.status === "failed").length;

    // Close SMTP connection
    await client.close();

    // Log distribution
    const { error: logError } = await supabase
      .from("email_distributions")
      .insert({
        pdf_generation_id,
        distribution_profile_id,
        recipients: results,
        status: failedCount === 0 ? "sent" : (failedCount === results.length ? "failed" : "sent"),
        error_message: failedCount > 0 ? `${failedCount} recipients failed` : null,
        sent_by: user.id,
      });

    if (logError) console.error("Failed to log distribution:", logError);

    console.log("Distribution completed", {
      total: results.length,
      sent: results.filter(r => r.status === "sent").length,
      failed: failedCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          sent: results.filter(r => r.status === "sent").length,
          failed: failedCount,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error distributing PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
