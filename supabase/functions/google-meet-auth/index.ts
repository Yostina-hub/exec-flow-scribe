import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGoogleCredentials() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'google_oauth_credentials')
    .single();

  if (error || !data) {
    // Fallback to environment variables
    return {
      clientId: Deno.env.get('GOOGLE_CLIENT_ID'),
      clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET')
    };
  }

  return {
    clientId: data.value.clientId,
    clientSecret: data.value.clientSecret
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, meetingData } = await req.json();
    const credentials = await getGoogleCredentials();
    const GOOGLE_CLIENT_ID = credentials.clientId;
    const GOOGLE_CLIENT_SECRET = credentials.clientSecret;
    
    // Use the app URL for redirect, not the edge function URL
    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/');
    const REDIRECT_URI = `${appUrl}/google-oauth-callback`;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Get authorization URL
    if (action === 'getAuthUrl') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for tokens
    if (action === 'exchangeCode' && code) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange error:', error);
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();
      return new Response(
        JSON.stringify({ accessToken: tokens.access_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Google Calendar event with Meet link
    if (action === 'createMeeting' && meetingData) {
      const { accessToken, title, startTime, endTime, description, attendees } = meetingData;

      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC',
        },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        attendees: attendees?.map((email: string) => ({ email })) || [],
      };

      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!calendarResponse.ok) {
        const error = await calendarResponse.text();
        console.error('Calendar API error:', error);
        throw new Error('Failed to create Google Calendar event');
      }

      const calendarEvent = await calendarResponse.json();
      const meetLink = calendarEvent.hangoutLink || calendarEvent.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri;

      return new Response(
        JSON.stringify({ 
          meetLink,
          eventId: calendarEvent.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in google-meet-auth:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
