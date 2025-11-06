import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, keyPoints, language = 'en' } = await req.json();

    if (!meetingId || !keyPoints) {
      return new Response(
        JSON.stringify({ error: "Meeting ID and key points are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select("title, start_time")
      .eq("id", meetingId)
      .single();

    if (meetingError) throw meetingError;

    // Create PDF content
    const isAmharic = language === 'am';
    const title = isAmharic ? "ዋና ነጥቦች ማጠቃለያ" : "Key Points Summary";
    const date = new Date(meeting.start_time).toLocaleDateString(isAmharic ? 'am-ET' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const sections = {
      summary: isAmharic ? "አጠቃላይ እይታ" : "Summary",
      keyPoints: isAmharic ? "ዋና ነጥቦች" : "Main Discussion Points",
      decisions: isAmharic ? "ውሳኔዎች" : "Key Decisions",
      actionItems: isAmharic ? "የተግባር ነጥቦች" : "Action Items",
      keywords: isAmharic ? "ቁልፍ ቃላት" : "Keywords"
    };

    // Build HTML content
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 2cm; }
    body {
      font-family: 'Noto Sans', 'Noto Sans Ethiopic', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 20px;
    }
    h1 {
      color: #4F46E5;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .meeting-title {
      font-size: 20px;
      color: #666;
      margin: 10px 0;
    }
    .date {
      color: #999;
      font-size: 14px;
    }
    .section {
      margin: 25px 0;
      page-break-inside: avoid;
    }
    .section-title {
      color: #4F46E5;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E5E7EB;
    }
    .summary {
      background: #F3F4F6;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
      font-size: 15px;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    li {
      margin: 12px 0;
      padding-left: 25px;
      position: relative;
      font-size: 14px;
    }
    li:before {
      content: "•";
      color: #4F46E5;
      font-size: 20px;
      position: absolute;
      left: 0;
      top: -2px;
    }
    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .keyword {
      background: #EEF2FF;
      color: #4F46E5;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
      border: 1px solid #C7D2FE;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meeting-title">${meeting.title}</div>
    <div class="date">${date}</div>
  </div>

  <div class="section">
    <div class="section-title">${sections.summary}</div>
    <div class="summary">${keyPoints.summary}</div>
  </div>

  ${keyPoints.keyPoints.length > 0 ? `
  <div class="section">
    <div class="section-title">${sections.keyPoints}</div>
    <ul>
      ${keyPoints.keyPoints.map((point: string) => `<li>${point}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${keyPoints.decisions.length > 0 ? `
  <div class="section">
    <div class="section-title">${sections.decisions}</div>
    <ul>
      ${keyPoints.decisions.map((decision: string) => `<li>${decision}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${keyPoints.actionItems.length > 0 ? `
  <div class="section">
    <div class="section-title">${sections.actionItems}</div>
    <ul>
      ${keyPoints.actionItems.map((action: string) => `<li>${action}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${keyPoints.keywords.length > 0 ? `
  <div class="section">
    <div class="section-title">${sections.keywords}</div>
    <div class="keywords">
      ${keyPoints.keywords.map((keyword: string) => `<span class="keyword">${keyword}</span>`).join('')}
    </div>
  </div>
  ` : ''}
</body>
</html>
    `;

    // Use a PDF generation service (you could use Puppeteer, but for simplicity using a basic approach)
    // For production, consider using a dedicated PDF service
    const pdfResponse = await fetch("https://api.html2pdf.app/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: htmlContent,
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm"
        }
      })
    });

    if (!pdfResponse.ok) {
      // Fallback: return HTML as base64 if PDF service fails
      const base64Html = btoa(unescape(encodeURIComponent(htmlContent)));
      return new Response(
        JSON.stringify({ 
          htmlBase64: base64Html,
          fallback: true,
          message: "PDF service unavailable, returning HTML"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    return new Response(
      JSON.stringify({ pdfBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
