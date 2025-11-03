import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Calendar, Clock, MapPin, Users, CheckCircle, Smartphone, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { VirtualMeetingRoom } from '@/components/VirtualMeetingRoom';

export default function QuickJoinMeeting() {
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get('m');
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Detect device type
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setDeviceType(isMobile ? 'mobile' : 'desktop');

    if (meetingId) {
      checkAccessAndFetchMeeting();
    } else {
      toast({
        title: "Invalid Link",
        description: "Meeting ID not found",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [meetingId]);

  const checkAccessAndFetchMeeting = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to auth with return URL
        const returnUrl = encodeURIComponent(window.location.href);
        navigate(`/auth?return=${returnUrl}`);
        return;
      }

      // Fetch meeting details
      const { data: meetingData, error } = await supabase
        .from('meetings')
        .select(`
          *,
          meeting_attendees(user_id, response_status),
          guest_access_requests(user_id, status)
        `)
        .eq('id', meetingId)
        .maybeSingle();

      if (error || !meetingData) {
        toast({
          title: "Meeting Not Found",
          description: "This meeting does not exist or has been deleted",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Check if user has access (host, attendee, or approved guest)
      const isHost = meetingData.created_by === user.id;
      const isAttendee = meetingData.meeting_attendees?.some((a: any) => a.user_id === user.id);
      const isApprovedGuest = meetingData.guest_access_requests?.some(
        (g: any) => g.user_id === user.id && g.status === 'approved'
      );

      if (!isHost && !isAttendee && !isApprovedGuest) {
        // Auto-request guest access
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle();

        const { error: requestError } = await supabase
          .from('guest_access_requests')
          .insert({
            user_id: user.id,
            meeting_id: meetingId,
            full_name: profile?.full_name || '',
            email: profile?.email || user.email || '',
            status: 'pending'
          });

        if (!requestError) {
          toast({
            title: "Access Requested",
            description: "Your access request has been sent to the meeting host",
          });
        }

        navigate('/');
        return;
      }

      // If not already an attendee, add them
      if (!isAttendee && !isHost) {
        await supabase
          .from('meeting_attendees')
          .insert({
            meeting_id: meetingId,
            user_id: user.id,
            response_status: 'accepted'
          });
      }

      setMeeting(meetingData);
      setHasAccess(true);
    } catch (error) {
      console.error('Error checking access:', error);
      toast({
        title: "Error",
        description: "Failed to check meeting access",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = async () => {
    setJoining(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Track join event
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          meeting_id: meetingId,
          action_type: 'meeting_joined',
          action_details: {
            device_type: deviceType,
            join_time: new Date().toISOString()
          }
        });

      toast({
        title: `Joining from ${deviceType === 'mobile' ? 'Mobile' : 'Desktop'}`,
        description: "Your speech will be transcribed in real-time",
      });

      // Enter the virtual meeting room
      setInRoom(true);
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast({
        title: "Error",
        description: "Failed to join meeting",
        variant: "destructive"
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have access to this meeting.
            </p>
            <Button onClick={() => navigate('/')} className="mt-4 w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inRoom) {
    return (
      <div className="min-h-screen bg-black">
        <VirtualMeetingRoom
          meetingId={meeting.id}
          isHost={meeting.created_by === meeting.id}
          currentUserId={meeting.created_by}
          onCloseRoom={() => {
            setInRoom(false);
            navigate('/');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/10 to-background">
      <Card className="w-full max-w-2xl border-2 border-primary/20 shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
              <Video className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">{meeting.title}</CardTitle>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Access Granted
            </Badge>
            <Badge variant="outline" className="gap-1">
              {deviceType === 'mobile' ? (
                <Smartphone className="h-3 w-3" />
              ) : (
                <Monitor className="h-3 w-3" />
              )}
              {deviceType === 'mobile' ? 'Mobile' : 'Desktop'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Meeting Details */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>{format(new Date(meeting.start_time), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>
                {format(new Date(meeting.start_time), 'h:mm a')} - {format(new Date(meeting.end_time), 'h:mm a')}
              </span>
            </div>
            {meeting.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{meeting.location}</span>
              </div>
            )}
            {meeting.meeting_attendees && (
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>{meeting.meeting_attendees.length} attendees</span>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Live Transcription', icon: '📝' },
              { label: 'Real-time Sync', icon: '🔄' },
              { label: 'Multi-device', icon: '📱' },
              { label: 'AI Assistant', icon: '🤖' },
            ].map((feature, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
              >
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-sm font-medium">{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Join Button */}
          <Button 
            onClick={joinMeeting}
            disabled={joining}
            className="w-full h-14 text-lg gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
          >
            {joining ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                Join Meeting Now
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your speech will be automatically transcribed and synced with all participants in real-time
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
