import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, meetingId, roomName } = await req.json();
    console.log(`Jitsi recording ${action} for room: ${roomName}, meeting: ${meetingId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Jitsi configuration from environment
    const jitsiDomain = Deno.env.get('JITSI_DOMAIN') || 'tmeet.gubatech.com';
    const jitsiApiToken = Deno.env.get('JITSI_API_TOKEN'); // JWT token for Jitsi API

    if (!jitsiApiToken) {
      console.warn('JITSI_API_TOKEN not configured, using local recording fallback');
      // Return success but use local audio recording instead
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Using local audio recording (Jitsi API not configured)',
          useLocalRecording: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'start') {
      // Start Jitsi recording via API
      // This uses the Jibri recording API
      const jitsiResponse = await fetch(`https://${jitsiDomain}/jibri/api/v1.0/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jitsiApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName,
          sessionId: meetingId,
          metadata: {
            meetingId,
            startTime: new Date().toISOString()
          }
        }),
      });

      if (!jitsiResponse.ok) {
        const errorText = await jitsiResponse.text();
        console.error('Jitsi recording start failed:', errorText);
        
        // Fallback to local recording
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Using local audio recording (Jitsi recording unavailable)',
            useLocalRecording: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const recordingData = await jitsiResponse.json();
      console.log('Jitsi recording started:', recordingData);

      // Store recording metadata
      await supabase.from('jitsi_recordings').insert({
        meeting_id: meetingId,
        room_name: roomName,
        recording_id: recordingData.recordingId || `rec_${meetingId}`,
        status: 'recording',
        started_at: new Date().toISOString()
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          recordingId: recordingData.recordingId,
          message: 'Jitsi recording started successfully' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'stop') {
      // Stop Jitsi recording
      const jitsiResponse = await fetch(`https://${jitsiDomain}/jibri/api/v1.0/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jitsiApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName,
          sessionId: meetingId
        }),
      });

      if (!jitsiResponse.ok) {
        console.error('Jitsi recording stop failed');
        return new Response(
          JSON.stringify({ success: true, message: 'Recording stopped (local mode)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const stopData = await jitsiResponse.json();
      console.log('Jitsi recording stopped:', stopData);

      // Update recording metadata
      await supabase
        .from('jitsi_recordings')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          recording_url: stopData.recordingUrl
        })
        .eq('meeting_id', meetingId);

      // Start background processing of the recording
      if (stopData.recordingUrl) {
        // Process recording in background (fire and forget)
        processRecording(meetingId, stopData.recordingUrl).catch(err => 
          console.error('Background recording processing error:', err)
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          recordingUrl: stopData.recordingUrl,
          message: 'Recording stopped and processing started' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Jitsi recording control error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processRecording(meetingId: string, recordingUrl: string) {
  console.log(`Background processing recording for meeting ${meetingId}`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Download the recording
    const response = await fetch(recordingUrl);
    if (!response.ok) throw new Error('Failed to download recording');

    const audioBlob = await response.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    // Convert to base64 for transcription
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    );

    // Call transcription function
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { 
        audio: base64Audio,
        meetingId,
        source: 'jitsi_recording'
      }
    });

    if (error) throw error;

    console.log(`Recording transcription completed for meeting ${meetingId}`);

    // Update meeting status
    await supabase
      .from('meetings')
      .update({ transcription_status: 'completed' })
      .eq('id', meetingId);

  } catch (error: any) {
    console.error('Error processing recording:', error);
    
    await supabase
      .from('jitsi_recordings')
      .update({ 
        status: 'failed', 
        error_message: error?.message || 'Unknown error during processing' 
      })
      .eq('meeting_id', meetingId);
  }
}
