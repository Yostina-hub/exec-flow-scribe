import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Auto-triggered function when all signatures are collected
 * Automatically distributes minutes via email to all attendees
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signatureRequestId } = await req.json();
    
    if (!signatureRequestId) {
      return new Response(
        JSON.stringify({ error: "Signature request ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔔 Checking signature completion:", signatureRequestId);

    // Fetch signature request with related data
    const { data: sigRequest, error: sigError } = await supabase
      .from("signature_requests")
      .select(`
        *,
        countersignatures(status)
      `)
      .eq("id", signatureRequestId)
      .single();

    if (sigError || !sigRequest) {
      console.error("Signature request not found:", sigError);
      return new Response(
        JSON.stringify({ error: "Signature request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if all signatures are collected
    const allApproved = sigRequest.status === 'approved' && 
      (!sigRequest.countersignatures || 
       sigRequest.countersignatures.length === 0 ||
       sigRequest.countersignatures.every((cs: any) => cs.status === 'approved'));

    if (!allApproved) {
      console.log("⏳ Not all signatures collected yet");
      return new Response(
        JSON.stringify({ 
          message: "Waiting for all signatures",
          status: "pending"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ All signatures collected - triggering auto-distribution");

    // Check if meeting_id exists
    if (!sigRequest.meeting_id) {
      console.error("Signature request has no meeting_id");
      return new Response(
        JSON.stringify({ error: "Signature request is not associated with a meeting" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get meeting and PDF details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", sigRequest.meeting_id)
      .maybeSingle();

    if (meetingError) {
      console.error("Error fetching meeting:", meetingError);
      return new Response(
        JSON.stringify({ error: "Error fetching meeting", details: meetingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!meeting) {
      console.error("Meeting not found for ID:", sigRequest.meeting_id);
      return new Response(
        JSON.stringify({ error: `Meeting not found (ID: ${sigRequest.meeting_id})` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get PDF URL from latest PDF generation
    const { data: pdfGen } = await supabase
      .from("pdf_generations")
      .select("pdf_url")
      .eq("meeting_id", sigRequest.meeting_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const pdfUrl = pdfGen?.pdf_url || meeting.pdf_url;

    // Trigger auto-distribution
    const { data: distResult, error: distError } = await supabase.functions.invoke(
      'auto-distribute-minutes',
      {
        body: {
          meetingId: sigRequest.meeting_id,
          pdfUrl: pdfUrl
        }
      }
    );

    if (distError) {
      console.error("Distribution failed:", distError);
      return new Response(
        JSON.stringify({ error: "Distribution failed", details: distError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Minutes distributed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Minutes distributed automatically after sign-off",
        distribution: distResult
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in auto-email-on-signoff:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});