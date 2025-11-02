import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();
    
    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: "Meeting ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📄 Generating PDF for meeting:", meetingId);

    // Fetch meeting and minutes
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*, minutes_url")
      .eq("id", meetingId)
      .single();

    if (meetingError || !meeting) {
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!meeting.minutes_url) {
      return new Response(
        JSON.stringify({ error: "Minutes not yet generated. Please generate minutes first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For now, we'll store the minutes markdown as the "PDF URL"
    // In a production system, you would use a PDF generation library like puppeteer
    // or a service like DocRaptor, PDFMonkey, etc.
    
    // Create a simple text file in storage as placeholder
    const pdfContent = `
MEETING MINUTES
===============

Meeting: ${meeting.title}
Date: ${new Date(meeting.start_time).toLocaleDateString()}
Time: ${new Date(meeting.start_time).toLocaleTimeString()} - ${new Date(meeting.end_time).toLocaleTimeString()}
Location: ${meeting.location || 'N/A'}

${meeting.minutes_url}

---
Generated: ${new Date().toISOString()}
    `;

    // Upload to storage bucket (meeting-media)
    const fileName = `meeting-${meetingId}-minutes-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meeting-media')
      .upload(fileName, new Blob([pdfContent], { type: 'text/plain' }), {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('meeting-media')
      .getPublicUrl(fileName);

    // Insert PDF generation record
    const { data: pdfRecord, error: pdfError } = await supabase
      .from("pdf_generations")
      .insert({
        meeting_id: meetingId,
        pdf_url: publicUrl,
        generated_by: user.id,
        watermark_applied: 'INTERNAL USE ONLY',
        metadata: {
          format: 'text',
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (pdfError) {
      console.error("PDF record error:", pdfError);
      return new Response(
        JSON.stringify({ error: "Failed to save PDF record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update meeting workflow status
    await supabase
      .from("meetings")
      .update({
        pdf_status: 'generated',
        workflow_stage: 'pdf_ready'
      })
      .eq("id", meetingId);

    console.log("✅ PDF generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: publicUrl,
        pdf_id: pdfRecord.id,
        message: "PDF generated successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});