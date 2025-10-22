import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { VirtualMeetingRoom } from "@/components/VirtualMeetingRoom";
import { TimeBasedAccessGuard } from "@/components/TimeBasedAccessGuard";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GuestMeetingViewProps {
  meetingId: string;
  userId: string;
}

/**
 * Simplified meeting view for guest users
 * Only shows essential meeting info and join button
 */
export function GuestMeetingView({ meetingId, userId }: GuestMeetingViewProps) {
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVirtualRoom, setShowVirtualRoom] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    fetchMeetingDetails();
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      const { data: meetingData, error } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_attendees(count)
        `)
        .eq("id", meetingId)
        .single();

      if (error) throw error;

      setMeeting(meetingData);
      setAttendeeCount(meetingData.meeting_attendees?.[0]?.count || 0);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading meeting details...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Meeting not found or you don't have access to this meeting.
        </AlertDescription>
      </Alert>
    );
  }

  const isMeetingCompleted = meeting.status === 'completed';
  const isOnlineMeeting = meeting.meeting_type === 'online' || meeting.meeting_type === 'hybrid';
  const hasVideoLink = !!meeting.video_conference_url;

  // Show virtual room
  if (showVirtualRoom && !isMeetingCompleted) {
    return (
      <VirtualMeetingRoom
        meetingId={meetingId}
        isHost={false}
        currentUserId={userId}
        onCloseRoom={() => setShowVirtualRoom(false)}
      />
    );
  }

  const getStatusBadge = () => {
    switch (meeting.status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'in-progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="text-muted-foreground">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <TimeBasedAccessGuard meetingId={meetingId}>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Welcome banner */}
        <Alert className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            Welcome! You've been granted guest access to this meeting.
          </AlertDescription>
        </Alert>

        {/* Meeting header card */}
        <Card className="border-2">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  {getStatusBadge()}
                  {meeting.meeting_type && (
                    <Badge variant="outline">{meeting.meeting_type}</Badge>
                  )}
                </div>
                <CardTitle className="text-3xl">{meeting.title}</CardTitle>
                <CardDescription className="text-base">
                  {meeting.description || "No description provided"}
                </CardDescription>
              </div>
            </div>

            <Separator />

            {/* Meeting details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(meeting.scheduled_at), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(meeting.scheduled_at), 'h:mm a')}
                    {meeting.duration_minutes && ` (${meeting.duration_minutes} min)`}
                  </p>
                </div>
              </div>

              {meeting.location && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{meeting.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Attendees</p>
                  <p className="text-sm text-muted-foreground">
                    {attendeeCount} participant{attendeeCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Separator />
            
            {/* Action buttons */}
            <div className="space-y-3">
              {isMeetingCompleted ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    This meeting has been completed. Thank you for your participation.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
                    onClick={() => setShowVirtualRoom(true)}
                  >
                    <Sparkles className="h-5 w-5" />
                    Join Virtual Room
                  </Button>

                  {isOnlineMeeting && hasVideoLink && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => window.open(meeting.video_conference_url, '_blank')}
                    >
                      <Video className="h-5 w-5" />
                      Join Video Call
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Guest limitations notice */}
            <Alert variant="default" className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Guest Access:</strong> You can join and participate in the meeting. 
                Advanced features like minutes generation, analytics, and document management 
                are available to registered members only.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Additional info */}
        {meeting.agenda && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meeting Agenda</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {meeting.agenda}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TimeBasedAccessGuard>
  );
}
