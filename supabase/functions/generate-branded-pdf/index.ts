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

  // Ethio Telecom Brand Colors
  const primaryColor = brandKit?.color_primary || "#FF6B00"; // Ethio Telecom Orange
  const secondaryColor = brandKit?.color_secondary || "#00A651"; // Ethio Telecom Green
  const accentColor = brandKit?.color_accent || "#FF8C00"; // Light Orange
  const orgName = brandKit?.organization_name || "Ethio Telecom";
  
  const docHash = approvalStamp?.hash?.substring(0, 12) || 'UNVERIFIED';
  const qrCodeData = `https://verify.docs/${docHash}`;

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

  // Check if content has Ethiopic script
  const hasEthiopicScript = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/.test(minutesVersion.content);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${meeting.title} - Official Meeting Minutes Document">
  <meta name="document-hash" content="${docHash}">
  <title>${meeting.title} - Ethio Telecom Official Minutes</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700&family=Noto+Sans+Ethiopic:wght@300;400;500;600;700&display=swap');
    
    @page { 
      margin: 1.5cm 2cm;
      size: A4;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9pt;
        color: #94a3b8;
      }
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${hasEthiopicScript ? "'Noto Sans Ethiopic', " : ""}'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: ${hasEthiopicScript ? '2.0' : '1.7'};
      color: #0f172a;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      font-size: ${hasEthiopicScript ? '11pt' : '10.5pt'};
      position: relative;
      overflow-x: hidden;
      letter-spacing: ${hasEthiopicScript ? '0.3px' : 'normal'};
    }
    
    ${watermark ? `
    body::before {
      content: '${watermark}';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      font-weight: 900;
      background: linear-gradient(135deg, ${primaryColor}15 0%, ${accentColor}08 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      z-index: 0;
      white-space: nowrap;
      opacity: 0.3;
      letter-spacing: 8px;
      text-transform: uppercase;
      pointer-events: none;
    }
    
    body::after {
      content: '';
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, ${accentColor}10 0%, transparent 70%);
      border-radius: 50%;
      z-index: 0;
      pointer-events: none;
    }
    ` : ''}
    
    .document-container {
      max-width: 820px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    
    /* Decorative Elements */
    .corner-ornament {
      position: absolute;
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, ${primaryColor}20 0%, transparent 70%);
      border-radius: 0 0 100% 0;
      top: 0;
      right: 0;
      pointer-events: none;
    }
    
    /* Header Section with Ultra-Modern Design */
    .header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${accentColor} 100%);
      color: white;
      padding: 48px;
      border-radius: 16px;
      margin-bottom: 48px;
      box-shadow: 0 20px 60px -10px ${primaryColor}40, 0 0 0 1px ${primaryColor}20;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 2;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    
    .logo { 
      max-width: 140px;
      height: auto;
      filter: brightness(0) invert(1) drop-shadow(0 4px 8px rgba(0,0,0,0.1));
    }
    
    .org-info { flex: 1; }
    
    .org-name { 
      font-family: 'Playfair Display', serif;
      font-size: 32pt;
      font-weight: 700;
      letter-spacing: -1px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 6px;
    }
    
    .document-type {
      font-size: 13pt;
      font-weight: 400;
      opacity: 0.95;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    
    .header-meta {
      text-align: right;
      font-size: 9pt;
      opacity: 0.9;
      background: rgba(255,255,255,0.1);
      padding: 12px 16px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
    
    .doc-id {
      font-weight: 600;
      font-family: 'Courier New', monospace;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    
    /* Meeting Info Card with Glassmorphism */
    .meeting-info {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 2px solid transparent;
      background-clip: padding-box;
      position: relative;
      padding: 32px;
      margin-bottom: 40px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8);
    }
    
    .meeting-info::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 12px;
      padding: 2px;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
    }
    
    .meeting-title { 
      font-size: 22pt;
      font-weight: 700;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    
    .meeting-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    
    .meeting-meta-item {
      background: linear-gradient(135deg, ${primaryColor}08 0%, ${accentColor}05 100%);
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 3px solid ${primaryColor};
      font-size: 9.5pt;
    }
    
    .meeting-meta-item strong {
      display: block;
      color: ${primaryColor};
      font-weight: 600;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.5px;
    }
    
    .meeting-meta-item span {
      color: #1e293b;
      font-weight: 500;
    }
    
    /* Ultra-Modern Approval Stamp */
    .approval-stamp {
      background: linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #059669 100%);
      color: white;
      padding: 32px;
      margin: 40px 0;
      border-radius: 16px;
      box-shadow: 0 20px 50px -10px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.2);
      page-break-inside: avoid;
      position: relative;
      overflow: hidden;
    }
    
    .approval-stamp::before {
      content: '✓';
      position: absolute;
      top: -30px;
      right: -30px;
      font-size: 200pt;
      opacity: 0.08;
      font-weight: 900;
      line-height: 1;
    }
    
    .stamp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    
    .stamp-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .stamp-title-section { flex: 1; margin-left: 16px; }
    
    .stamp-title { 
      font-weight: 800;
      font-size: 16pt;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 4px;
    }
    
    .stamp-subtitle {
      font-size: 10pt;
      opacity: 0.9;
      font-weight: 400;
    }
    
    .stamp-details {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      position: relative;
      z-index: 1;
    }
    
    .stamp-detail-item {
      background: rgba(255, 255, 255, 0.2);
      padding: 14px 16px;
      border-radius: 10px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.3);
    }
    
    .stamp-detail-label {
      font-weight: 700;
      margin-bottom: 4px;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      opacity: 0.9;
    }
    
    .stamp-detail-value {
      font-size: 10pt;
      font-weight: 500;
    }
    
    .verification-qr {
      position: absolute;
      right: 32px;
      top: 50%;
      transform: translateY(-50%);
      background: white;
      padding: 8px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    /* Content Sections with Modern Design */
    .section { 
      margin: 48px 0;
      page-break-inside: avoid;
      position: relative;
    }
    
    .section-title {
      font-size: 18pt;
      font-weight: 700;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      border-bottom: 3px solid;
      border-image: linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%) 1;
      padding-bottom: 12px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    
    .section-title::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, ${accentColor} 0%, transparent 100%);
    }
    
    .section-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      color: white;
      border-radius: 12px;
      font-size: 14pt;
      font-weight: 700;
      box-shadow: 0 4px 12px ${primaryColor}40;
    }
    
    /* Minutes Content with Enhanced Typography */
    .minutes-content {
      background: white;
      padding: 32px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      position: relative;
    }
    
    .minutes-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%);
      border-radius: 12px 12px 0 0;
    }
    
    .content-h1 {
      font-size: 17pt;
      font-weight: 700;
      color: ${primaryColor};
      margin: 32px 0 16px 0;
      padding: 16px 0 8px 16px;
      border-left: 4px solid ${accentColor};
      background: linear-gradient(90deg, ${primaryColor}08 0%, transparent 100%);
      border-radius: 0 8px 8px 0;
    }
    
    .content-h1:first-child {
      margin-top: 0;
    }
    
    .content-h2 {
      font-size: 13pt;
      font-weight: 600;
      color: #475569;
      margin: 24px 0 12px 0;
      padding-left: 12px;
      border-left: 3px solid ${accentColor}60;
    }
    
    .content-p {
      margin: 10px 0;
      text-align: justify;
      line-height: ${hasEthiopicScript ? '2.2' : '1.9'};
      color: #334155;
      hyphens: auto;
      font-size: ${hasEthiopicScript ? '11.5pt' : 'inherit'};
      letter-spacing: ${hasEthiopicScript ? '0.4px' : 'normal'};
    }
    
    .content-li {
      margin: 8px 0 8px 32px;
      list-style-type: none;
      line-height: ${hasEthiopicScript ? '2.1' : '1.8'};
      position: relative;
      padding-left: 8px;
      font-size: ${hasEthiopicScript ? '11.5pt' : 'inherit'};
      letter-spacing: ${hasEthiopicScript ? '0.4px' : 'normal'};
    }
    
    .content-li::before {
      content: '▸';
      position: absolute;
      left: -20px;
      color: ${accentColor};
      font-weight: 700;
    }
    
    /* Modern Decision & Action Cards */
    .decision-card {
      background: linear-gradient(135deg, #ffffff 0%, #fefce8 100%);
      border: 2px solid #fbbf24;
      border-left: 6px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 12px;
      page-break-inside: avoid;
      box-shadow: 0 4px 16px rgba(251, 191, 36, 0.15);
      position: relative;
    }
    
    .action-card {
      background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%);
      border: 2px solid #60a5fa;
      border-left: 6px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 12px;
      page-break-inside: avoid;
      box-shadow: 0 4px 16px rgba(96, 165, 250, 0.15);
      position: relative;
    }
    
    .decision-card::before {
      content: '⚡';
      position: absolute;
      top: 16px;
      right: 16px;
      font-size: 24pt;
      opacity: 0.15;
    }
    
    .action-card::before {
      content: '✓';
      position: absolute;
      top: 16px;
      right: 16px;
      font-size: 24pt;
      opacity: 0.15;
    }
    
    .card-title {
      font-weight: 700;
      font-size: 12pt;
      color: #0f172a;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid currentColor;
      opacity: 0.9;
    }
    
    .decision-card .card-title {
      color: #b45309;
    }
    
    .action-card .card-title {
      color: #1e40af;
    }
    
    .card-content {
      color: #334155;
      font-size: 10pt;
      margin: 12px 0;
      line-height: 1.8;
    }
    
    .card-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px dashed #cbd5e1;
    }
    
    .card-meta-item {
      background: rgba(255,255,255,0.7);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 9pt;
    }
    
    .card-meta-item strong {
      display: block;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 2px;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    
    /* Exhibit Cards with Modern Design */
    .exhibit-card {
      background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
      border: 2px solid #cbd5e1;
      border-left: 6px solid ${secondaryColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 12px;
      page-break-inside: avoid;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      transition: all 0.3s ease;
    }
    
    .exhibit-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    
    .exhibit-badge {
      background: linear-gradient(135deg, ${secondaryColor} 0%, ${accentColor} 100%);
      color: white;
      padding: 6px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 9pt;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px ${secondaryColor}40;
    }
    
    .exhibit-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 11pt;
    }
    
    .exhibit-details {
      background: rgba(255,255,255,0.7);
      padding: 12px;
      border-radius: 8px;
      font-size: 9pt;
    }
    
    .exhibit-details div {
      margin: 6px 0;
      color: #475569;
    }
    
    .exhibit-details strong {
      color: #1e293b;
      margin-right: 6px;
    }
    
    /* Enhanced Footer */
    .footer {
      margin-top: 80px;
      padding: 32px 0;
      border-top: 3px solid;
      border-image: linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%) 1;
      position: relative;
    }
    
    .footer::before {
      content: '';
      position: absolute;
      top: -3px;
      left: 0;
      width: 120px;
      height: 3px;
      background: linear-gradient(90deg, ${accentColor} 0%, transparent 100%);
    }
    
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 20px;
    }
    
    .footer-left {
      text-align: left;
    }
    
    .footer-left strong {
      color: ${primaryColor};
      font-size: 10pt;
    }
    
    .footer-right {
      text-align: right;
      font-size: 8pt;
      opacity: 0.8;
    }
    
    .confidential-notice {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px solid #fca5a5;
      color: #991b1b;
      padding: 16px 20px;
      border-radius: 10px;
      margin-top: 20px;
      font-size: 9pt;
      text-align: center;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
      letter-spacing: 0.3px;
    }
    
    .document-hash {
      text-align: center;
      margin-top: 16px;
      padding: 12px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }
    
    .document-hash strong {
      color: ${primaryColor};
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .document-hash code {
      display: block;
      margin-top: 6px;
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      color: #475569;
      word-break: break-all;
    }
    
    /* Print Styles for Perfect Output */
    @media print {
      body {
        background: white;
      }
      .page-break {
        page-break-before: always;
      }
      .approval-stamp, .decision-card, .action-card, .exhibit-card {
        page-break-inside: avoid;
      }
      @page {
        margin: 1.5cm 2cm;
      }
    }
  </style>
</head>
<body>
  <div class="corner-ornament"></div>
  <div class="document-container">
    <!-- Ethio Telecom Professional Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo-section">
          ${brandKit?.logo_url ? `<img src="${brandKit.logo_url}" class="logo" alt="${orgName} Logo" />` : `
          <svg width="120" height="60" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" class="logo">
            <rect width="120" height="60" fill="white" opacity="0.1"/>
            <text x="10" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">ETHIO</text>
            <text x="10" y="52" font-family="Arial, sans-serif" font-size="14" fill="white" opacity="0.9">TELECOM</text>
          </svg>
          `}
          <div class="org-info">
            <div class="org-name">${orgName}</div>
            <div class="document-type">Official Meeting Minutes Document</div>
          </div>
        </div>
        <div class="header-meta">
          <div class="doc-id">DOC-${docHash.toUpperCase()}</div>
          <div style="margin-top: 4px; font-size: 8pt; opacity: 0.8;">Classification: Internal</div>
          <div style="margin-top: 2px;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
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
    <!-- Ethio Telecom Official Approval Stamp -->
    <div class="approval-stamp">
      <div class="stamp-header">
        <div class="stamp-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="26" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="2"/>
            <path d="M16 28 L24 36 L40 20" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
        <div class="stamp-title-section">
          <div class="stamp-title">✓ OFFICIALLY APPROVED & DIGITALLY SIGNED</div>
          <div class="stamp-subtitle">This document has been authenticated and verified by ${orgName}</div>
        </div>
      </div>
      <div class="stamp-details">
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">🖊️ Authorized Signatory</div>
          <div class="stamp-detail-value">${approvalStamp.approved_by}</div>
        </div>
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">📅 Approval Date & Time</div>
          <div class="stamp-detail-value">${new Date(approvalStamp.approved_at).toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">📋 Document Version</div>
          <div class="stamp-detail-value">Version ${approvalStamp.version_number}.0</div>
        </div>
        <div class="stamp-detail-item">
          <div class="stamp-detail-label">🔐 Digital Signature Hash</div>
          <div class="stamp-detail-value" style="font-family: monospace; font-size: 7pt; word-break: break-all;">${approvalStamp.hash.substring(0, 32)}...</div>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.15); border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.3);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
          <div style="font-size: 9pt; opacity: 0.95;">
            <strong>Verification Code:</strong> ${docHash.toUpperCase().substring(0, 8)}-${new Date(approvalStamp.approved_at).getFullYear()}
          </div>
          <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.3);"></div>
          <div style="font-size: 9pt; opacity: 0.95;">
            <strong>Status:</strong> <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">APPROVED</span>
          </div>
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

    <!-- Ethio Telecom Professional Footer -->
    <div class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <div><strong>${orgName}</strong></div>
          <div style="margin-top: 4px; font-size: 8.5pt;">Official Meeting Minutes Document</div>
          <div style="margin-top: 8px; font-size: 8pt; opacity: 0.8; line-height: 1.5;">
            ${orgName === 'Ethio Telecom' ? `
            📍 Churchill Avenue, Addis Ababa, Ethiopia<br/>
            📞 +251-115-515-000 | 📧 info@ethiotelecom.et<br/>
            🌐 www.ethiotelecom.et
            ` : `Contact: info@${orgName.toLowerCase().replace(/\s+/g, '')}.et`}
          </div>
        </div>
        <div class="footer-right">
          <div style="margin-bottom: 6px;"><strong>Document Information</strong></div>
          <div style="font-size: 8.5pt;">Generated: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</div>
          <div style="font-size: 8.5pt; margin-top: 2px;">Time: ${new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })}</div>
          <div style="font-size: 8pt; margin-top: 4px; opacity: 0.8;">Page 1 of 1</div>
        </div>
      </div>
      
      ${approvalStamp ? `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 20px; border-radius: 8px; margin: 16px 0; text-align: center; font-size: 9pt; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
        ✓ This is an officially approved and digitally signed document
      </div>
      ` : `
      <div class="confidential-notice">
        🔒 CONFIDENTIAL & PROPRIETARY - This document contains sensitive information for authorized recipients only
      </div>
      `}
      
      <div class="document-hash">
        <strong>🔐 Document Verification Code:</strong>
        <code>${docHash.toUpperCase()}-${new Date().getFullYear()}-ET</code>
        <div style="margin-top: 6px; font-size: 7pt; opacity: 0.7;">
          Verify this document at: verify.ethiotelecom.et/doc/${docHash.substring(0, 12)}
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 7pt; color: #64748b;">
        © ${new Date().getFullYear()} ${orgName}. All rights reserved. | Document ID: ${docHash.substring(0, 8).toUpperCase()}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
