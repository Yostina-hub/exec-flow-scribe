import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: "Meeting ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch transcriptions for the meeting
    console.log("📋 Fetching transcriptions for meeting:", meetingId);
    
    const { data: transcriptions, error } = await supabase
      .from("transcriptions")
      .select("id, content, speaker_name, timestamp, confidence_score")
      .eq("meeting_id", meetingId)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Error fetching transcriptions:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch transcriptions" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`✅ Found ${transcriptions?.length || 0} transcriptions`);

    return new Response(
      JSON.stringify({ transcriptions: transcriptions || [] }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("list-transcriptions error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
