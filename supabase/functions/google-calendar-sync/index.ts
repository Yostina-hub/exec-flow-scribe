import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Get Google OAuth credentials
    const { data: credentials } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'google_oauth_credentials')
      .single();

    if (!credentials?.value) {
      throw new Error('Google Calendar not configured');
    }

    // Get user's Google access token (stored after OAuth)
    const { data: userTokenData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', `google_token_${user.id}`)
      .single();

    const accessToken = userTokenData?.value?.access_token;
    if (!accessToken) {
      throw new Error('Google Calendar not connected. Please authenticate first.');
    }

    if (action === 'twoWaySync') {
      let importedCount = 0;
      let exportedCount = 0;

      // IMPORT: Get events from Google Calendar
      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=50`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        
        for (const event of calendarData.items || []) {
          // Skip if already imported
          const { data: existing } = await supabase
            .from('meetings')
            .select('id')
            .eq('google_event_id', event.id)
            .single();

          if (!existing) {
            // Import new event
            const { error: insertError } = await supabase
              .from('meetings')
              .insert({
                title: event.summary || 'Untitled Event',
                description: event.description,
                start_time: event.start.dateTime || event.start.date,
                end_time: event.end.dateTime || event.end.date,
                location: event.location || 'Google Calendar',
                status: 'scheduled',
                created_by: user.id,
                google_event_id: event.id,
                video_conference_url: event.hangoutLink,
                timezone: event.start.timeZone || 'UTC',
              });

            if (!insertError) importedCount++;
          }
        }
      }

      // EXPORT: Send meetings to Google Calendar
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .eq('created_by', user.id)
        .is('google_event_id', null)
        .gte('start_time', new Date().toISOString())
        .limit(20);

      for (const meeting of meetings || []) {
        const event = {
          summary: meeting.title,
          description: meeting.description || '',
          start: {
            dateTime: meeting.start_time,
            timeZone: meeting.timezone || 'UTC',
          },
          end: {
            dateTime: meeting.end_time,
            timeZone: meeting.timezone || 'UTC',
          },
          location: meeting.location,
        };

        const createResponse = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (createResponse.ok) {
          const createdEvent = await createResponse.json();
          
          // Update meeting with Google event ID
          await supabase
            .from('meetings')
            .update({ google_event_id: createdEvent.id })
            .eq('id', meeting.id);

          exportedCount++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          importedCount, 
          exportedCount 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in google-calendar-sync:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
