import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { meetingId, content, timestamp, speaker, detectedLanguage } = await req.json();
    if (!meetingId || !content) {
      return new Response(JSON.stringify({ error: "meetingId and content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize meetingId if needed
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function stringToUUID(input: string) {
      const s = String(input);
      let h1 = 0xdeadbeef >>> 0, h2 = 0x41c6ce57 >>> 0;
      for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761) >>> 0;
        h2 = Math.imul(h2 ^ ch, 1597334677) >>> 0;
      }
      h1 = (h1 ^ (h1 >>> 16)) >>> 0;
      h2 = (h2 ^ (h2 >>> 13)) >>> 0;
      const bytes = new Uint8Array(16);
      const v = new DataView(bytes.buffer);
      v.setUint32(0, h1);
      v.setUint32(4, h2);
      v.setUint32(8, h1 ^ h2);
      v.setUint32(12, (h1 >>> 1) ^ (h2 << 1));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    const normalizedMeetingId = uuidRegex.test(String(meetingId)) ? String(meetingId) : stringToUUID(String(meetingId));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    // Get authed user (for attribution)
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt || "");

    // Get meeting attendees with names to map speakers
    const { data: attendees } = await supabase
      .from("meeting_attendees")
      .select(`
        user_id,
        profiles(full_name)
      `)
      .eq("meeting_id", normalizedMeetingId);

    // Map speaker to actual attendee name if possible
    let speakerName = speaker?.trim() || 'Unknown Speaker';
    
    // If no specific speaker name or generic name, try to identify from attendees
    if (userData?.user?.id && attendees && attendees.length > 0) {
      // Check if current user is speaking
      const currentUserAttendee = attendees.find((a: any) => a.user_id === userData.user.id);
      const userProfile = currentUserAttendee?.profiles as any;
      if (userProfile?.full_name) {
        speakerName = userProfile.full_name;
      } else if (!speaker || speaker === 'User' || speaker === 'Speaker') {
        // Assign speaker numbers based on order in attendees
        const speakerIndex = attendees.findIndex((a: any) => {
          const profile = a.profiles as any;
          return !speakerName.includes(profile?.full_name || '');
        });
        if (speakerIndex >= 0) {
          const attendeeProfile = (attendees[speakerIndex] as any).profiles as any;
          if (attendeeProfile?.full_name) {
            speakerName = attendeeProfile.full_name;
          }
        }
        // Fallback to sequential numbering if no match found
        if (speakerName === speaker?.trim() || speakerName === 'Unknown Speaker') {
          const { count } = await supabase
            .from("transcriptions")
            .select("speaker_name", { count: 'exact', head: true })
            .eq("meeting_id", normalizedMeetingId);
          speakerName = `Speaker ${(count || 0) + 1}`;
        }
      }
    }

    const insertPayload: Record<string, any> = {
      meeting_id: normalizedMeetingId,
      content: content.trim(),
      timestamp: timestamp || new Date().toISOString(),
      detected_language: detectedLanguage || 'auto',
      confidence_score: 0.95,
      speaker_name: speakerName
    };

    console.log(`💾 Saving transcription: speaker=${speakerName}, lang=${detectedLanguage}`);

    // Check if there's a recent transcription from the same speaker (within 30 seconds)
    const { data: recentTranscriptions } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("meeting_id", normalizedMeetingId)
      .eq("speaker_name", speakerName)
      .order("timestamp", { ascending: false })
      .limit(1);

    const now = new Date(timestamp || new Date().toISOString());
    const shouldConsolidate = recentTranscriptions && 
      recentTranscriptions.length > 0 && 
      recentTranscriptions[0].speaker_name === speakerName &&
      (now.getTime() - new Date(recentTranscriptions[0].timestamp).getTime()) < 30000; // 30 seconds

    if (shouldConsolidate && recentTranscriptions[0]) {
      // Update the existing transcription by appending the new content
      const { error: updateError } = await supabase
        .from("transcriptions")
        .update({
          content: recentTranscriptions[0].content + " " + content.trim(),
          timestamp: now.toISOString() // Update to latest timestamp
        })
        .eq("id", recentTranscriptions[0].id);

      if (updateError) {
        console.error("❌ save-transcription update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update transcription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("✅ Transcription consolidated with previous segment");
    } else {
      // Insert new transcription
      const { error } = await supabase.from("transcriptions").insert(insertPayload);
      if (error) {
        console.error("❌ save-transcription DB error:", error);
        return new Response(JSON.stringify({ error: "Failed to save transcription to database" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("✅ New transcription segment created");
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-transcription error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});