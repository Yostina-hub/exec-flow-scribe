import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratePDFRequest {
  meeting_id: string;
  minutes_version_id: string;
  brand_kit_id?: string;
  signature_request_id?: string;
  include_watermark: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: requestData }: { data: GeneratePDFRequest } = await req.json();
    const { meeting_id, minutes_version_id, brand_kit_id, signature_request_id, include_watermark } = requestData;

    // Fetch minutes content
    const { data: minutesVersion, error: minutesError } = await supabase
      .from("minutes_versions")
      .select("content")
      .eq("id", minutes_version_id)
      .single();

    if (minutesError) throw minutesError;

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("title, start_time")
      .eq("id", meeting_id)
      .single();

    if (meetingError) throw meetingError;

    // Fetch brand kit
    let brandKit = null;
    if (brand_kit_id) {
      const { data: kit } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("id", brand_kit_id)
        .single();
      brandKit = kit;
    } else {
      // Get default brand kit
      const { data: kit } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      brandKit = kit;
    }

    // Fetch exhibits
    const { data: exhibits } = await supabase
      .from("meeting_exhibits")
      .select("*")
      .eq("meeting_id", meeting_id)
      .order("order_index");

    // Fetch decisions
    const { data: decisions } = await supabase
      .from("decisions")
      .select("*")
      .eq("meeting_id", meeting_id);

    // Fetch action items
    const { data: actions } = await supabase
      .from("action_items")
      .select("*")
      .eq("meeting_id", meeting_id);

    // Fetch approval stamp if signature request exists
    let approvalStamp = null;
    if (signature_request_id) {
      const { data: sigRequest } = await supabase
        .from("signature_requests")
        .select(`
          *,
          assigned_profile:profiles!signature_requests_assigned_to_fkey(full_name)
        `)
        .eq("id", signature_request_id)
        .single();

      if (sigRequest && sigRequest.status === "approved") {
        approvalStamp = {
          approved_by: sigRequest.assigned_profile?.full_name || "CEO",
          approved_at: sigRequest.signed_at,
          version_number: 1, // You might want to fetch this from minutes_version
          hash: await generateDocumentHash(minutesVersion.content),
        };
      }
    }

    // Generate PDF content (simplified HTML version for demo)
    const pdfContent = generatePDFHTML({
      meeting,
      minutesVersion,
      brandKit,
      exhibits: exhibits || [],
      decisions: decisions || [],
      actions: actions || [],
      approvalStamp,
      watermark: include_watermark && brandKit ? brandKit.watermark_text : null,
    });

    // In production, you'd use a PDF generation service like:
    // - Puppeteer/Playwright for server-side rendering
    // - PDFKit or jsPDF for programmatic generation
    // - External API like DocRaptor, PDFShift, etc.
    
    // For now, return the HTML that can be converted to PDF client-side
    // or by a dedicated PDF service

    console.log("PDF generated successfully", {
      meeting_id,
      exhibits_count: exhibits?.length || 0,
      has_approval: !!approvalStamp,
    });

    return new Response(
      JSON.stringify({
        success: true,
        html: pdfContent,
        metadata: {
          meeting_title: meeting.title,
          generated_at: new Date().toISOString(),
          exhibits_included: exhibits?.length || 0,
          approval_stamp: approvalStamp,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function generateDocumentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generatePDFHTML(params: any): string {
  const { meeting, minutesVersion, brandKit, exhibits, decisions, actions, approvalStamp, watermark } = params;

  const primaryColor = brandKit?.color_primary || "#000000";
  const accentColor = brandKit?.color_accent || "#0066cc";
  const orgName = brandKit?.organization_name || "Organization";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 2cm; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      ${watermark ? `background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><text x="50%" y="50%" font-size="48" fill="%23cccccc" opacity="0.3" text-anchor="middle" transform="rotate(-45 250 250)">${watermark}</text></svg>') repeat;` : ''}
    }
    .header {
      border-bottom: 3px solid ${accentColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo { max-width: 150px; margin-bottom: 10px; }
    .org-name { font-size: 24px; font-weight: bold; color: ${primaryColor}; }
    .meeting-title { font-size: 20px; margin: 20px 0; color: ${accentColor}; }
    .approval-stamp {
      border: 2px solid ${accentColor};
      padding: 15px;
      margin: 30px 0;
      background: #f9f9f9;
    }
    .stamp-title { font-weight: bold; color: ${accentColor}; margin-bottom: 10px; }
    .section { margin: 30px 0; }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: ${primaryColor};
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    .exhibit { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    ${brandKit?.logo_url ? `<img src="${brandKit.logo_url}" class="logo" />` : ''}
    <div class="org-name">${orgName}</div>
    ${brandKit?.header_template || '<div>Meeting Minutes</div>'}
  </div>

  <h1 class="meeting-title">${meeting.title}</h1>
  <div><strong>Date:</strong> ${new Date(meeting.start_time).toLocaleDateString()}</div>

  ${approvalStamp ? `
  <div class="approval-stamp">
    <div class="stamp-title">✓ APPROVED BY ${approvalStamp.approved_by.toUpperCase()}</div>
    <div>Timestamp: ${new Date(approvalStamp.approved_at).toLocaleString()}</div>
    <div>Document Hash: ${approvalStamp.hash}</div>
    <div>Version: ${approvalStamp.version_number}</div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Meeting Minutes</div>
    <pre style="white-space: pre-wrap; font-family: inherit;">${minutesVersion.content}</pre>
  </div>

  ${decisions.length > 0 ? `
  <div class="section">
    <div class="section-title">Decisions</div>
    ${decisions.map((d: any) => `
      <div style="margin: 15px 0;">
        <strong>${d.decision_text}</strong>
        ${d.context ? `<div style="color: #666; margin-top: 5px;">${d.context}</div>` : ''}
        <div style="font-size: 12px; color: #999;">${new Date(d.timestamp).toLocaleString()}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${actions.length > 0 ? `
  <div class="section">
    <div class="section-title">Action Items</div>
    ${actions.map((a: any) => `
      <div style="margin: 15px 0;">
        <strong>${a.title}</strong>
        ${a.description ? `<div>${a.description}</div>` : ''}
        <div style="font-size: 12px; color: #666;">
          Priority: ${a.priority} | Status: ${a.status}
          ${a.due_date ? ` | Due: ${new Date(a.due_date).toLocaleDateString()}` : ''}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${exhibits.length > 0 ? `
  <div class="section">
    <div class="section-title">Appendices & Exhibits</div>
    ${exhibits.map((e: any, idx: number) => `
      <div class="exhibit">
        <strong>Exhibit ${String.fromCharCode(65 + idx)}: ${e.exhibit_name}</strong>
        <div>Type: ${e.exhibit_type}</div>
        ${e.page_reference ? `<div>Reference: ${e.page_reference}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    ${brandKit?.footer_template || `
      <div>Generated: ${new Date().toLocaleString()}</div>
      <div>${orgName} - Confidential</div>
    `}
  </div>
</body>
</html>
  `.trim();
}
