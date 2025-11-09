import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, summary } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get meeting details
    const { data: meeting } = await supabase
      .from("meetings")
      .select("title, start_time, end_time")
      .eq("id", meetingId)
      .single();

    if (!meeting) {
      throw new Error("Meeting not found");
    }

    // Generate PDF content using jsPDF-like structure
    const pdfContent = {
      title: `Meeting Closing Summary - ${meeting.title}`,
      sections: [
        {
          heading: "Meeting Information",
          content: [
            `Title: ${meeting.title}`,
            `Date: ${meeting.start_time ? new Date(meeting.start_time).toLocaleDateString() : 'TBD'}`,
            `Status: ${summary.overallStatus || 'N/A'}`,
            `Tempo: ${summary.tempo || 'N/A'}`,
          ]
        },
        {
          heading: "Meeting Metrics",
          content: [
            `Completion Rate: ${summary.completionRate}%`,
            `Meeting Effectiveness: ${summary.meetingEffectiveness}%`,
            `Participation Score: ${summary.participationScore}%`,
          ]
        },
        {
          heading: "Key Achievements",
          content: summary.keyAchievements || []
        },
        {
          heading: "Open Items",
          content: summary.openItems || []
        },
        {
          heading: "Next Steps",
          content: summary.nextSteps || []
        },
        {
          heading: "Recommendations",
          content: summary.recommendations || []
        }
      ]
    };

    // Generate a simple PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const margin = 50;
    let y = 742; // top margin (792 - 50)

    const drawText = (text: string, size = 12, color = rgb(0, 0, 0)) => {
      page.drawText(text, { x: margin, y, size, font, color });
      y -= size + 6;
    };

    // Title
    drawText(pdfContent.title, 16);
    y -= 8;

    for (const section of pdfContent.sections) {
      // Check for new page if needed
      if (y < 120) {
        const newPage = pdfDoc.addPage([612, 792]);
        y = 742;
        (page as any) = newPage;
      }
      // Heading
      drawText(section.heading, 14);

      for (const item of section.content as string[]) {
        if (y < 60) {
          const newPage = pdfDoc.addPage([612, 792]);
          y = 742;
          (page as any) = newPage;
        }
        drawText(`• ${item}`, 12);
      }

      y -= 6;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    return new Response(JSON.stringify({ pdfBase64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
