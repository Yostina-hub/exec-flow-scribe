import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('Processing authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast({
          title: 'Authorization cancelled',
          description: 'Using TMeet instead',
          variant: 'destructive',
        });
        
        // Fall back to TMeet
        const pendingData = sessionStorage.getItem('pendingInstantMeeting');
        if (pendingData) {
          const meetingData = JSON.parse(pendingData);
          await createMeetingWithTMeet(meetingData);
        } else {
          navigate('/meetings');
        }
        return;
      }

      if (!code) {
        toast({
          title: 'Authorization failed',
          description: 'No authorization code received',
          variant: 'destructive',
        });
        navigate('/meetings');
        return;
      }

      try {
        setStatus('Exchanging authorization code...');
        
        // Check which OAuth flow this is (Meet or Drive)
        const oauthFlow = sessionStorage.getItem('oauth_flow') || 'meet';
        
        if (oauthFlow === 'drive') {
          // Handle Drive OAuth
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
            'google-drive-auth',
            { body: { action: 'exchangeCode', code } }
          );

          if (tokenError) throw tokenError;

          // Store the access token for Drive operations
          sessionStorage.setItem('google_drive_token', tokenData.tokens.access_token);
          sessionStorage.removeItem('oauth_flow');

          toast({
            title: 'Google Drive Connected',
            description: 'You can now sync files with Google Drive',
          });

          navigate('/drive-integration');
          return;
        }
        
        // Handle Google Meet OAuth (existing flow)
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
          'google-meet-auth',
          { body: { action: 'exchangeCode', code } }
        );

        if (tokenError) throw tokenError;

        // Get pending meeting data
        const pendingData = sessionStorage.getItem('pendingInstantMeeting');
        if (!pendingData) {
          throw new Error('No pending meeting data found');
        }

        const meetingData = JSON.parse(pendingData);
        sessionStorage.removeItem('pendingInstantMeeting');

        setStatus('Creating Google Meet link...');

        // Create Meeting with Google Calendar
        const { data: meetData, error: meetError } = await supabase.functions.invoke(
          'google-meet-auth',
          {
            body: {
              action: 'createMeeting',
              meetingData: {
                accessToken: tokenData.accessToken,
                title: meetingData.title,
                startTime: meetingData.startTime,
                endTime: meetingData.endTime,
                description: 'Instant meeting',
              }
            }
          }
        );

        if (meetError) throw meetError;

        setStatus('Creating meeting in database...');

        // Create meeting in database
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: meeting, error: meetingError } = await supabase
          .from('meetings')
          .insert({
            title: meetingData.title,
            start_time: meetingData.startTime,
            end_time: meetingData.endTime,
            location: 'Virtual',
            description: 'Instant meeting',
            created_by: user.id,
            status: 'in_progress' as any,
            meeting_type: 'online' as any,
            video_conference_url: meetData.meetLink,
            video_provider: 'google_meet' as any,
            timezone: 'Africa/Addis_Ababa',
            is_recurring: false,
          } as any)
          .select()
          .single();

        if (meetingError) throw meetingError;

        await supabase
          .from('meeting_attendees')
          .insert({
            meeting_id: meeting.id,
            user_id: user.id,
            role: 'required',
            attendance_confirmed: true,
          });

        toast({
          title: 'Meeting created!',
          description: 'Your Google Meet is ready',
        });

        navigate(`/meetings/${meeting.id}`);
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        
        toast({
          title: 'Google Meet setup failed',
          description: 'Creating meeting with TMeet instead',
          variant: 'destructive',
        });

        // Fall back to TMeet
        const pendingData = sessionStorage.getItem('pendingInstantMeeting');
        if (pendingData) {
          const meetingData = JSON.parse(pendingData);
          await createMeetingWithTMeet(meetingData);
        } else {
          navigate('/meetings');
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  const createMeetingWithTMeet = async (meetingData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          title: meetingData.title,
          start_time: meetingData.startTime,
          end_time: meetingData.endTime,
          location: 'Virtual',
          description: 'Instant meeting',
          created_by: user.id,
          status: 'in_progress' as any,
          meeting_type: 'standard' as any,
          timezone: 'Africa/Addis_Ababa',
          is_recurring: false,
        } as any)
        .select()
        .single();

      if (meetingError) throw meetingError;

      await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          role: 'required',
          attendance_confirmed: true,
        });

      navigate(`/meetings/${meeting.id}`);
    } catch (error) {
      console.error('Failed to create TMeet meeting:', error);
      navigate('/meetings');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-lg font-medium">{status}</p>
      <p className="text-sm text-muted-foreground">Please wait...</p>
    </div>
  );
}
