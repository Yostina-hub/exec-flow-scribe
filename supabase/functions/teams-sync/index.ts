import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamsSyncRequest {
  meetingId: string;
  action: 'create' | 'update' | 'sync_attendees' | 'sync_recording';
  teamsData?: {
    onlineMeetingId?: string;
    joinUrl?: string;
    accessToken?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { meetingId, action, teamsData }: TeamsSyncRequest = await req.json();

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError) throw meetingError;

    let result: any = {};

    switch (action) {
      case 'create':
        // Create Teams meeting
        result = await createTeamsMeeting(meeting, teamsData?.accessToken);
        
        // Update meeting with Teams info
        await supabaseClient
          .from('meetings')
          .update({
            video_provider: 'teams',
            video_conference_url: result.joinUrl,
            metadata: { teamsOnlineMeetingId: result.id }
          })
          .eq('id', meetingId);

        // Create integration record
        await supabaseClient
          .from('meeting_integrations')
          .insert({
            meeting_id: meetingId,
            integration_type: 'teams',
            external_id: result.id,
            external_url: result.joinUrl,
            sync_status: 'active'
          });
        break;

      case 'update':
        // Update Teams meeting
        result = await updateTeamsMeeting(
          teamsData?.onlineMeetingId!,
          meeting,
          teamsData?.accessToken
        );
        break;

      case 'sync_attendees':
        // Sync attendees to Teams
        result = await syncAttendeesToTeams(
          meetingId,
          teamsData?.onlineMeetingId!,
          teamsData?.accessToken,
          supabaseClient
        );
        break;

      case 'sync_recording':
        // Fetch recording from Teams
        result = await fetchTeamsRecording(
          teamsData?.onlineMeetingId!,
          meetingId,
          teamsData?.accessToken,
          supabaseClient
        );
        break;
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in Teams sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function createTeamsMeeting(meeting: any, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Microsoft Teams access token required');
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDateTime: meeting.start_time,
      endDateTime: meeting.end_time,
      subject: meeting.title,
      participants: {
        organizer: {
          identity: {
            user: {
              id: meeting.created_by
            }
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Teams API error: ${await response.text()}`);
  }

  return await response.json();
}

async function updateTeamsMeeting(onlineMeetingId: string, meeting: any, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Microsoft Teams access token required');
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${onlineMeetingId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDateTime: meeting.start_time,
        endDateTime: meeting.end_time,
        subject: meeting.title
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Teams API error: ${await response.text()}`);
  }

  return await response.json();
}

async function syncAttendeesToTeams(
  meetingId: string,
  onlineMeetingId: string,
  accessToken: string | undefined,
  supabaseClient: any
) {
  if (!accessToken) {
    throw new Error('Microsoft Teams access token required');
  }

  // Get attendees from database
  const { data: attendees } = await supabaseClient
    .from('meeting_attendees')
    .select('user_id, profiles(email)')
    .eq('meeting_id', meetingId);

  if (!attendees || attendees.length === 0) {
    return { message: 'No attendees to sync' };
  }

  // Update Teams meeting with attendees
  const attendeesList = attendees.map((a: any) => ({
    identity: {
      user: {
        id: a.profiles?.email
      }
    },
    role: 'attendee'
  }));

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${onlineMeetingId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        participants: {
          attendees: attendeesList
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Teams API error: ${await response.text()}`);
  }

  return await response.json();
}

async function fetchTeamsRecording(
  onlineMeetingId: string,
  meetingId: string,
  accessToken: string | undefined,
  supabaseClient: any
) {
  if (!accessToken) {
    throw new Error('Microsoft Teams access token required');
  }

  // Fetch recording from Teams
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${onlineMeetingId}/recordings`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Teams API error: ${await response.text()}`);
  }

  const recordings = await response.json();

  if (recordings.value && recordings.value.length > 0) {
    const recording = recordings.value[0];
    
    // Store recording reference in database
    await supabaseClient
      .from('meeting_media')
      .insert({
        meeting_id: meetingId,
        media_type: 'recording',
        file_url: recording.recordingContentUrl,
        metadata: {
          source: 'teams',
          recordingId: recording.id,
          duration: recording.duration
        }
      });

    return { success: true, recording };
  }

  return { message: 'No recordings found' };
}
