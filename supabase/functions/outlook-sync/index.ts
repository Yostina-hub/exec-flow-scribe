import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutlookSyncRequest {
  meetingId: string;
  action: 'create' | 'update' | 'sync_attendees' | 'delete';
  outlookData?: {
    eventId?: string;
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

    const { meetingId, action, outlookData }: OutlookSyncRequest = await req.json();

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
        // Create Outlook calendar event
        result = await createOutlookEvent(meeting, outlookData?.accessToken, supabaseClient);
        
        // Create integration record
        await supabaseClient
          .from('meeting_integrations')
          .insert({
            meeting_id: meetingId,
            integration_type: 'outlook',
            external_id: result.id,
            external_url: result.webLink,
            sync_status: 'active'
          });
        break;

      case 'update':
        // Update Outlook event
        result = await updateOutlookEvent(
          outlookData?.eventId!,
          meeting,
          outlookData?.accessToken
        );
        break;

      case 'sync_attendees':
        // Sync attendees to Outlook
        result = await syncAttendeesToOutlook(
          meetingId,
          outlookData?.eventId!,
          outlookData?.accessToken,
          supabaseClient
        );
        break;

      case 'delete':
        // Delete Outlook event
        result = await deleteOutlookEvent(
          outlookData?.eventId!,
          outlookData?.accessToken
        );
        
        // Update integration status
        await supabaseClient
          .from('meeting_integrations')
          .update({ sync_status: 'deleted' })
          .eq('meeting_id', meetingId)
          .eq('integration_type', 'outlook');
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
    console.error('Error in Outlook sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function createOutlookEvent(meeting: any, accessToken: string | undefined, supabaseClient: any) {
  if (!accessToken) {
    throw new Error('Outlook access token required');
  }

  // Get attendees
  const { data: attendees } = await supabaseClient
    .from('meeting_attendees')
    .select('user_id, profiles(email, full_name)')
    .eq('meeting_id', meeting.id);

  const attendeesList = (attendees || []).map((a: any) => ({
    emailAddress: {
      address: a.profiles?.email,
      name: a.profiles?.full_name
    },
    type: 'required'
  }));

  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: meeting.title,
      body: {
        contentType: 'HTML',
        content: meeting.description || 'Meeting scheduled via Exec Flow Scribe'
      },
      start: {
        dateTime: meeting.start_time,
        timeZone: 'UTC'
      },
      end: {
        dateTime: meeting.end_time,
        timeZone: 'UTC'
      },
      location: {
        displayName: meeting.location || 'TBD'
      },
      attendees: attendeesList,
      isOnlineMeeting: !!meeting.video_conference_url,
      onlineMeetingUrl: meeting.video_conference_url
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Outlook API error: ${error}`);
  }

  return await response.json();
}

async function updateOutlookEvent(eventId: string, meeting: any, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Outlook access token required');
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: meeting.title,
        start: {
          dateTime: meeting.start_time,
          timeZone: 'UTC'
        },
        end: {
          dateTime: meeting.end_time,
          timeZone: 'UTC'
        },
        location: {
          displayName: meeting.location || 'TBD'
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Outlook API error: ${await response.text()}`);
  }

  return await response.json();
}

async function syncAttendeesToOutlook(
  meetingId: string,
  eventId: string,
  accessToken: string | undefined,
  supabaseClient: any
) {
  if (!accessToken) {
    throw new Error('Outlook access token required');
  }

  // Get attendees from database
  const { data: attendees } = await supabaseClient
    .from('meeting_attendees')
    .select('user_id, profiles(email, full_name)')
    .eq('meeting_id', meetingId);

  if (!attendees || attendees.length === 0) {
    return { message: 'No attendees to sync' };
  }

  const attendeesList = attendees.map((a: any) => ({
    emailAddress: {
      address: a.profiles?.email,
      name: a.profiles?.full_name
    },
    type: 'required'
  }));

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attendees: attendeesList
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Outlook API error: ${await response.text()}`);
  }

  return await response.json();
}

async function deleteOutlookEvent(eventId: string, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Outlook access token required');
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Outlook API error: ${await response.text()}`);
  }

  return { success: true, message: 'Event deleted' };
}
