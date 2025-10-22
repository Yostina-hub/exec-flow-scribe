import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VirtualMeetingRoom } from '@/components/VirtualMeetingRoom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { GuestLayout } from '@/components/GuestLayout';

export default function QuickParticipant() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [meetingId]);

  const checkAccess = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if user is already an attendee or has approved guest access
        const { data: attendee } = await supabase
          .from('meeting_attendees')
          .select('*')
          .eq('meeting_id', meetingId)
          .eq('user_id', user.id)
          .single();

        if (attendee) {
          setCurrentUserId(user.id);
          setJoined(true);
        } else {
          // Check if user has an approved guest access request
          const { data: guestRequest } = await supabase
            .from('guest_access_requests')
            .select('*')
            .eq('meeting_id', meetingId)
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .single();

          if (guestRequest) {
            // Approved guest - check if they're already in attendees
            const { error: addError } = await supabase
              .from('meeting_attendees')
              .insert({
                meeting_id: meetingId,
                user_id: user.id,
                attended: false
              });

            if (!addError) {
              setCurrentUserId(user.id);
              setJoined(true);
            }
          }
        }
      }

      // Fetch meeting details
      const { data: meetingData, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error || !meetingData) {
        toast({
          title: "Meeting Not Found",
          description: "This meeting does not exist or has been deleted",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Check if meeting is active
      if (meetingData.status !== 'in_progress') {
        toast({
          title: "Meeting Not Active",
          description: "This meeting has not started yet or has ended",
          variant: "destructive",
        });
      }

      setMeeting(meetingData);
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAsGuest = async () => {
    if (!guestName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Create anonymous user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `guest_${Date.now()}@temp.meeting`,
        password: Math.random().toString(36).substring(7),
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Failed to create guest user');

      // Create profile
      await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: guestName,
          email: `guest_${Date.now()}@temp.meeting`,
        });

      // Add as meeting attendee
      await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: meetingId,
          user_id: userId,
          role: 'participant',
          response_status: 'accepted',
          can_speak: false,
        });

      setCurrentUserId(userId);
      setJoined(true);

      toast({
        title: "Joined Successfully",
        description: `Welcome to the meeting, ${guestName}!`,
      });
    } catch (error) {
      console.error('Error joining as guest:', error);
      toast({
        title: "Failed to Join",
        description: "Could not join the meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <GuestLayout guestName={guestName || undefined}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md p-6">
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">{meeting?.title}</h1>
                <p className="text-muted-foreground">Enter your name to join</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="guestName">Your Name</Label>
                  <Input
                    id="guestName"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinAsGuest()}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleJoinAsGuest}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Meeting'
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                By joining, you agree to the meeting terms and conditions.
                Your access will be limited to this meeting only.
              </p>
            </div>
          </Card>
        </div>
      </GuestLayout>
    );
  }

  if (!meeting || meeting.status !== 'in_progress') {
    return (
      <GuestLayout guestName={guestName || undefined}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-6 text-center space-y-4">
            <h2 className="text-xl font-semibold mb-2">Meeting Not Available</h2>
            <p className="text-muted-foreground">
              This meeting is not currently active.
            </p>
            <Button
              onClick={() => navigate('/guest')}
              className="w-full gap-2"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </GuestLayout>
    );
  }

  return (
    <VirtualMeetingRoom
      meetingId={meetingId!}
      isHost={false}
      currentUserId={currentUserId!}
    />
  );
}
