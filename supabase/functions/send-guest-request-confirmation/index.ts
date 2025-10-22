import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GuestRequestConfirmationRequest {
  guestEmail: string;
  guestName: string;
  meetingTitle: string;
  meetingStartTime: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Guest request confirmation email function invoked");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      guestEmail,
      guestName,
      meetingTitle,
      meetingStartTime,
    }: GuestRequestConfirmationRequest = await req.json();

    console.log(`📧 Preparing confirmation email for: ${guestName} (${guestEmail})`);

    // Fetch SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabaseClient
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (smtpError || !smtpSettings) {
      console.log("⚠️ SMTP not configured, skipping confirmation email");
      return new Response(
        JSON.stringify({
          success: false,
          message: "SMTP not configured",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`📨 Using SMTP host: ${smtpSettings.host}`);

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

    // Format the meeting date/time
    const meetingDate = new Date(meetingStartTime);
    const formattedDate = meetingDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = meetingDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create HTML email template (no indentation to avoid =20 encoding)
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; }
.header h1 { margin: 0; font-size: 28px; font-weight: 600; }
.content { padding: 40px 30px; }
.greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
.message { font-size: 16px; color: #555; margin-bottom: 30px; }
.meeting-details { background: #f8f9fa; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px; }
.meeting-details h2 { margin: 0 0 15px 0; color: #f59e0b; font-size: 20px; }
.detail-row { display: flex; margin: 10px 0; font-size: 15px; }
.detail-label { font-weight: 600; min-width: 80px; color: #333; }
.detail-value { color: #555; }
.status-box { background: #fff3cd; border: 2px solid #f59e0b; border-radius: 6px; padding: 20px; margin: 25px 0; text-align: center; }
.status-icon { font-size: 48px; margin-bottom: 10px; }
.status-text { font-size: 18px; font-weight: 600; color: #854d0e; margin: 0; }
.info-box { background: #e0f2fe; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 4px; margin: 20px 0; }
.info-box p { margin: 5px 0; font-size: 14px; color: #0c4a6e; }
.footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 13px; color: #666; border-top: 1px solid #e0e0e0; }
.footer p { margin: 5px 0; }
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>📋 Request Received</h1>
</div>
<div class="content">
<p class="greeting">Hello ${guestName},</p>
<p class="message">Thank you for submitting your guest access request. We have received your request for the following meeting:</p>
<div class="meeting-details">
<h2>📅 Meeting Details</h2>
<div class="detail-row"><span class="detail-label">Title:</span><span class="detail-value">${meetingTitle}</span></div>
<div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${formattedDate}</span></div>
<div class="detail-row"><span class="detail-label">Time:</span><span class="detail-value">${formattedTime}</span></div>
</div>
<div class="status-box">
<div class="status-icon">⏳</div>
<p class="status-text">Your request is pending admin approval</p>
</div>
<div class="info-box">
<p><strong>What happens next?</strong></p>
<p>1. An administrator will review your request</p>
<p>2. You'll receive an email once your request is approved</p>
<p>3. The approval email will include a direct link to join the meeting</p>
</div>
<p class="message" style="margin-top: 30px; font-size: 14px; color: #666;">If you have any questions or need to update your request, please contact the meeting organizer.</p>
</div>
<div class="footer">
<p><strong>MeetingHub</strong> - Executive Meeting Platform</p>
<p>This is an automated message. Please do not reply to this email.</p>
</div>
</div>
</body>
</html>`;

    // Send email
    console.log(`📤 Sending confirmation email to: ${guestEmail}`);
    
    await client.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: guestEmail,
      subject: `📋 Guest Access Request Received - ${meetingTitle}`,
      html: emailHtml,
    });

    await client.close();

    console.log(`✅ Confirmation email sent successfully to ${guestEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Guest request confirmation email sent successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send confirmation email",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
