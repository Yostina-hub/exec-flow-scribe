import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Generate simple text-based PDF content
    let textContent = `${pdfContent.title}\n\n`;
    
    pdfContent.sections.forEach(section => {
      textContent += `\n${section.heading}\n`;
      textContent += '='.repeat(section.heading.length) + '\n\n';
      
      section.content.forEach((item: string) => {
        textContent += `• ${item}\n`;
      });
      textContent += '\n';
    });

    // Return as downloadable text file (simplified PDF generation)
    return new Response(textContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="meeting-summary-${meetingId}.txt"`,
      },
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
