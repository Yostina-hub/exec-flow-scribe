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
  ArrowRight,
  Zap,
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

export function GuestMeetingView({ meetingId, userId }: GuestMeetingViewProps) {
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVirtualRoom, setShowVirtualRoom] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

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
        <div className="relative">
          <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
          <div className="absolute inset-0 bg-purple-500/20 blur-2xl animate-pulse" />
        </div>
        <div className="text-center space-y-2 animate-fade-in">
          <p className="text-xl font-semibold text-white">Loading your experience</p>
          <p className="text-sm text-purple-300/60">Preparing something amazing...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 backdrop-blur-sm animate-fade-in">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="text-white">
          Meeting not found or you don't have access to this meeting.
        </AlertDescription>
      </Alert>
    );
  }

  const isMeetingCompleted = meeting.status === 'completed';
  const isOnlineMeeting = meeting.meeting_type === 'online' || meeting.meeting_type === 'hybrid';
  const hasVideoLink = !!meeting.video_conference_url;

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
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 backdrop-blur-sm">
            Scheduled
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 backdrop-blur-sm animate-pulse">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Live Now
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 backdrop-blur-sm">
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <TimeBasedAccessGuard meetingId={meetingId}>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Welcome banner with gradient and animation */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 backdrop-blur-xl p-6 animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 animate-pulse" />
          <div className="relative flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">Welcome to Your Premium Experience</h3>
              <p className="text-purple-200/80">You've been granted exclusive guest access to this meeting</p>
            </div>
            <Zap className="h-8 w-8 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Main meeting card with glassmorphism */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden group hover:border-purple-500/50 transition-all duration-500 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardHeader className="space-y-6 relative">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge()}
                  {meeting.meeting_type && (
                    <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm">
                      {meeting.meeting_type}
                    </Badge>
                  )}
                </div>
                
                <CardTitle className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight">
                  {meeting.title}
                </CardTitle>
                
                {meeting.description && (
                  <CardDescription className="text-base text-purple-200/70 leading-relaxed">
                    {meeting.description}
                  </CardDescription>
                )}
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Meeting details grid with hover effects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: Calendar,
                  label: "Date",
                  value: format(new Date(meeting.scheduled_at), 'EEEE, MMMM d, yyyy'),
                  gradient: "from-blue-500 to-cyan-500"
                },
                {
                  icon: Clock,
                  label: "Time",
                  value: `${format(new Date(meeting.scheduled_at), 'h:mm a')}${meeting.duration_minutes ? ` (${meeting.duration_minutes} min)` : ''}`,
                  gradient: "from-purple-500 to-pink-500"
                },
                ...(meeting.location ? [{
                  icon: MapPin,
                  label: "Location",
                  value: meeting.location,
                  gradient: "from-green-500 to-emerald-500"
                }] : []),
                {
                  icon: Users,
                  label: "Attendees",
                  value: `${attendeeCount} participant${attendeeCount !== 1 ? 's' : ''}`,
                  gradient: "from-orange-500 to-red-500"
                }
              ].map((detail, index) => (
                <div
                  key={index}
                  className="group/item flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${detail.gradient} flex items-center justify-center shadow-lg group-hover/item:scale-110 transition-transform duration-300`}>
                    <detail.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-300/80">{detail.label}</p>
                    <p className="text-base text-white font-semibold">{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 relative">
            <Separator className="bg-white/10" />
            
            {/* Action buttons with premium styling */}
            <div className="space-y-4">
              {isMeetingCompleted ? (
                <Alert className="border-green-500/30 bg-green-500/10 backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <AlertDescription className="text-white">
                    This meeting has been completed. Thank you for your participation!
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="w-full gap-3 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-semibold text-lg py-7 rounded-xl shadow-2xl shadow-purple-500/50 relative overflow-hidden group transition-all duration-300 hover:scale-105"
                    onClick={() => setShowVirtualRoom(true)}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Sparkles className={`h-6 w-6 relative z-10 ${isHovering ? 'animate-spin' : ''}`} />
                    <span className="relative z-10">Join Virtual Room</span>
                    <ArrowRight className={`h-6 w-6 relative z-10 transition-transform duration-300 ${isHovering ? 'translate-x-2' : ''}`} />
                  </Button>

                  {isOnlineMeeting && hasVideoLink && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full gap-3 border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white font-semibold py-6 rounded-xl hover:border-white/40 transition-all duration-300 hover:scale-105"
                      onClick={() => window.open(meeting.video_conference_url, '_blank')}
                    >
                      <Video className="h-5 w-5" />
                      Join Video Call
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Guest limitations notice with premium styling */}
            <Alert className="border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-white/90 text-sm leading-relaxed">
                <strong className="text-yellow-300">Guest Access Mode:</strong> You can join and actively participate in the meeting. 
                Advanced features like AI minutes generation, analytics dashboards, and document management 
                are available exclusively to registered members.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Agenda card if available */}
        {meeting.agenda && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-xl hover:border-purple-500/30 transition-all duration-500 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                Meeting Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-purple-200/80 whitespace-pre-wrap leading-relaxed">
                {meeting.agenda}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TimeBasedAccessGuard>
  );
}
