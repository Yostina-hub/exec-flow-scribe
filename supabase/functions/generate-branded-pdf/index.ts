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

    const requestData: GeneratePDFRequest = await req.json();
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

  const primaryColor = brandKit?.color_primary || "#2563eb";
  const accentColor = brandKit?.color_accent || "#0ea5e9";
  const orgName = brandKit?.organization_name || "Organization";

  // Parse minutes content to format it better
  const formattedContent = minutesVersion.content
    .split('\n')
    .map((line: string) => {
      // Handle markdown headers
      if (line.startsWith('## ')) {
        return `<h2 class="content-h2">${line.substring(3)}</h2>`;
      } else if (line.startsWith('# ')) {
        return `<h1 class="content-h1">${line.substring(2)}</h1>`;
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        return `<li class="content-li">${line.substring(2)}</li>`;
      } else if (line.trim() === '') {
        return '<br/>';
      } else {
        return `<p class="content-p">${line}</p>`;
      }
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meeting.title} - Meeting Minutes</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    @page { 
      margin: 2cm; 
      size: A4;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      font-size: 11pt;
      ${watermark ? `
        position: relative;
      ` : ''}
    }
    
    ${watermark ? `
    body::before {
      content: '${watermark}';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72pt;
      color: rgba(0, 0, 0, 0.05);
      z-index: -1;
      white-space: nowrap;
      font-weight: 700;
    }
    ` : ''}
    
    .document-container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* Header Section */
    .header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      color: white;
      padding: 40px;
      border-radius: 8px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .logo { 
      max-width: 120px;
      height: auto;
      filter: brightness(0) invert(1);
    }
    
    .org-name { 
      font-size: 28pt;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .document-type {
      font-size: 14pt;
      font-weight: 300;
      opacity: 0.9;
      margin-top: 4px;
    }
    
    /* Meeting Info Card */
    .meeting-info {
      background: #f8fafc;
      border-left: 4px solid ${primaryColor};
      padding: 24px;
      margin-bottom: 32px;
      border-radius: 4px;
    }
    
    .meeting-title { 
      font-size: 20pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 12px;
    }
    
    .meeting-meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      font-size: 10pt;
      color: #64748b;
    }
    
    .meeting-meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .meeting-meta-item strong {
      color: #334155;
    }
    
    /* Approval Stamp */
    .approval-stamp {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 24px;
      margin: 32px 0;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
      page-break-inside: avoid;
    }
    
    .stamp-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .stamp-icon {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18pt;
    }
    
    .stamp-title { 
      font-weight: 700;
      font-size: 14pt;
      letter-spacing: 0.5px;
    }
    
    .stamp-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 9pt;
      opacity: 0.95;
    }
    
    .stamp-detail-item {
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 12px;
      border-radius: 4px;
    }
    
    .stamp-detail-label {
      font-weight: 600;
      margin-bottom: 2px;
    }
    
    /* Content Sections */
    .section { 
      margin: 40px 0;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 16pt;
      font-weight: 600;
      color: ${primaryColor};
      border-bottom: 3px solid ${accentColor};
      padding-bottom: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: ${accentColor};
      color: white;
      border-radius: 50%;
      font-size: 12pt;
      font-weight: 600;
    }
    
    /* Minutes Content */
    .minutes-content {
      background: white;
      padding: 24px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    
    .content-h1 {
      font-size: 16pt;
      font-weight: 600;
      color: ${primaryColor};
      margin: 24px 0 12px 0;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
    }
    
    .content-h1:first-child {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
    }
    
    .content-h2 {
      font-size: 13pt;
      font-weight: 600;
      color: #334155;
      margin: 20px 0 10px 0;
    }
    
    .content-p {
      margin: 8px 0;
      text-align: justify;
      line-height: 1.8;
    }
    
    .content-li {
      margin: 6px 0 6px 24px;
      list-style-type: disc;
      line-height: 1.7;
    }
    
    /* Decision Cards */
    .decision-card, .action-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-left: 4px solid ${primaryColor};
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .decision-card:hover, .action-card:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    }
    
    .card-title {
      font-weight: 600;
      font-size: 11pt;
      color: #1f2937;
      margin-bottom: 8px;
    }
    
    .card-content {
      color: #4b5563;
      font-size: 10pt;
      margin: 8px 0;
      line-height: 1.6;
    }
    
    .card-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      font-size: 9pt;
      color: #64748b;
    }
    
    .card-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 500;
    }
    
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
    
    .priority-high { color: #dc2626; font-weight: 600; }
    .priority-medium { color: #f59e0b; font-weight: 600; }
    .priority-low { color: #10b981; font-weight: 600; }
    
    /* Exhibit Cards */
    .exhibit-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      margin: 12px 0;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    
    .exhibit-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    
    .exhibit-badge {
      background: ${accentColor};
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 9pt;
    }
    
    .exhibit-title {
      font-weight: 600;
      color: #1f2937;
      font-size: 10pt;
    }
    
    .exhibit-details {
      color: #64748b;
      font-size: 9pt;
      margin-top: 4px;
    }
    
    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
    }
    
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: #64748b;
    }
    
    .footer-left {
      text-align: left;
    }
    
    .footer-right {
      text-align: right;
    }
    
    .confidential-notice {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
      font-size: 9pt;
      text-align: center;
      font-weight: 500;
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <div class="document-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo-section">
          ${brandKit?.logo_url ? `<img src="${brandKit.logo_url}" class="logo" alt="${orgName} Logo" />` : ''}
          <div>
            <div class="org-name">${orgName}</div>
            <div class="document-type">Meeting Minutes</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Meeting Info Card -->
    <div class="meeting-info">
      <h1 class="meeting-title">${meeting.title}</h1>
      <div class="meeting-meta">
        <div class="meeting-meta-item">
          <strong>📅 Date:</strong>
          <span>${new Date(meeting.start_time).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
        <div class="meeting-meta-item">
          <strong>⏰ Time:</strong>
          <span>${new Date(meeting.start_time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</span>
        </div>
        <div class="meeting-meta-item">
          <strong>📄 Document Generated:</strong>
          <span>${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>
    </div>

    ${approvalStamp ? `
    <!-- Approval Stamp -->
    <div class="approval-stamp">
      <div class="stamp-header">
        <div class="stamp-icon">✓</div>
        <div class="stamp-title">APPROVED & DIGITALLY SIGNED</div>
      </div>
      <div class="stamp-details">
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">Approved By</div>
          <div>${approvalStamp.approved_by}</div>
        </div>
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">Timestamp</div>
          <div>${new Date(approvalStamp.approved_at).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'medium'
          })}</div>
        </div>
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">Document Version</div>
          <div>v${approvalStamp.version_number}</div>
        </div>
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">Document Hash</div>
          <div style="font-family: monospace; font-size: 7pt; word-break: break-all;">${approvalStamp.hash.substring(0, 32)}...</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Minutes Content -->
    <div class="section">
      <h2 class="section-title">
        <span class="section-number">1</span>
        <span>Meeting Minutes</span>
      </h2>
      <div class="minutes-content">
        ${formattedContent}
      </div>
    </div>

    ${decisions.length > 0 ? `
    <!-- Decisions Section -->
    <div class="section page-break">
      <h2 class="section-title">
        <span class="section-number">2</span>
        <span>Decisions Made</span>
      </h2>
      ${decisions.map((d: any, idx: number) => `
        <div class="decision-card">
          <div class="card-title">Decision ${idx + 1}: ${d.decision_text}</div>
          ${d.context ? `<div class="card-content">${d.context}</div>` : ''}
          <div class="card-meta">
            <div class="card-meta-item">
              <strong>📅 Recorded:</strong> ${new Date(d.timestamp).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
            ${d.impact_level ? `
            <div class="card-meta-item">
              <strong>Impact:</strong> ${d.impact_level}
            </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${actions.length > 0 ? `
    <!-- Action Items Section -->
    <div class="section ${!decisions.length ? 'page-break' : ''}">
      <h2 class="section-title">
        <span class="section-number">${decisions.length > 0 ? '3' : '2'}</span>
        <span>Action Items</span>
      </h2>
      ${actions.map((a: any, idx: number) => `
        <div class="action-card">
          <div class="card-title">Action ${idx + 1}: ${a.title}</div>
          ${a.description ? `<div class="card-content">${a.description}</div>` : ''}
          <div class="card-meta">
            <div class="card-meta-item">
              <strong>Priority:</strong> 
              <span class="priority-${a.priority}">${a.priority.toUpperCase()}</span>
            </div>
            <div class="card-meta-item">
              <strong>Status:</strong>
              <span class="status-badge status-${a.status.replace('_', '-')}">${a.status.replace('_', ' ').toUpperCase()}</span>
            </div>
            ${a.due_date ? `
            <div class="card-meta-item">
              <strong>📅 Due:</strong> ${new Date(a.due_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${exhibits.length > 0 ? `
    <!-- Exhibits Section -->
    <div class="section page-break">
      <h2 class="section-title">
        <span class="section-number">${(decisions.length > 0 ? 3 : 2) + (actions.length > 0 ? 1 : 0)}</span>
        <span>Appendices & Exhibits</span>
      </h2>
      ${exhibits.map((e: any, idx: number) => `
        <div class="exhibit-card">
          <div class="exhibit-header">
            <span class="exhibit-badge">Exhibit ${String.fromCharCode(65 + idx)}</span>
            <span class="exhibit-title">${e.exhibit_name}</span>
          </div>
          <div class="exhibit-details">
            <div><strong>Type:</strong> ${e.exhibit_type}</div>
            ${e.page_reference ? `<div><strong>Reference:</strong> ${e.page_reference}</div>` : ''}
            ${e.file_url ? `<div><strong>File:</strong> ${e.file_url}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <div><strong>${orgName}</strong></div>
          <div>Meeting Minutes Report</div>
        </div>
        <div class="footer-right">
          <div>Generated: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
      <div class="confidential-notice">
        🔒 CONFIDENTIAL - This document contains sensitive information intended only for authorized recipients
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
