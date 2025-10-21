import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Mic,
  MicOff,
  Hand,
  Crown,
  UserCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface Attendee {
  id: string;
  user_id: string;
  role: string;
  can_speak: boolean;
  is_speaking: boolean;
  speaking_requested_at: string | null;
  attended: boolean;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface ParticipantDashboardProps {
  meetingId: string;
  isHost: boolean;
  currentUserId: string;
}

export function ParticipantDashboard({
  meetingId,
  isHost,
  currentUserId,
}: ParticipantDashboardProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchAttendees();

    // Real-time subscription for attendee changes
    const channel = supabase
      .channel(`meeting-${meetingId}-attendees`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meeting_attendees",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchAttendees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchAttendees = async () => {
    const { data, error } = await supabase
      .from("meeting_attendees")
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq("meeting_id", meetingId)
      .order("role", { ascending: true });

    if (error) {
      console.error("Error fetching attendees:", error);
      return;
    }

    setAttendees(data || []);
    setTotalCount(data?.length || 0);
  };

  const grantMicAccess = async (attendeeId: string, userId: string) => {
    // First, revoke all other speakers
    const { error: revokeError } = await supabase
      .from("meeting_attendees")
      .update({
        can_speak: false,
        is_speaking: false,
      })
      .eq("meeting_id", meetingId)
      .neq("id", attendeeId);

    if (revokeError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revoke other speakers",
      });
      return;
    }

    // Grant mic to selected participant
    const { error } = await supabase
      .from("meeting_attendees")
      .update({
        can_speak: true,
        is_speaking: true,
        microphone_granted_at: new Date().toISOString(),
        speaking_requested_at: null,
      })
      .eq("id", attendeeId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to grant microphone access",
      });
      return;
    }

    // Log the status change
    await supabase.from("participant_status_log").insert({
      meeting_id: meetingId,
      user_id: userId,
      status_type: "speaking_started",
      metadata: { granted_by: currentUserId },
    });

    toast({
      title: "Microphone granted",
      description: "Participant can now speak",
    });
  };

  const revokeMicAccess = async (attendeeId: string, userId: string) => {
    const { error } = await supabase
      .from("meeting_attendees")
      .update({
        can_speak: false,
        is_speaking: false,
      })
      .eq("id", attendeeId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revoke microphone access",
      });
      return;
    }

    // Log the status change
    await supabase.from("participant_status_log").insert({
      meeting_id: meetingId,
      user_id: userId,
      status_type: "speaking_ended",
      metadata: { revoked_by: currentUserId },
    });

    toast({
      title: "Microphone revoked",
      description: "Participant has been muted",
    });
  };

  const raiseHand = async () => {
    const myAttendee = attendees.find((a) => a.user_id === currentUserId);
    if (!myAttendee) return;

    const { error } = await supabase
      .from("meeting_attendees")
      .update({
        speaking_requested_at: new Date().toISOString(),
      })
      .eq("id", myAttendee.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to raise hand",
      });
      return;
    }

    // Log the status change
    await supabase.from("participant_status_log").insert({
      meeting_id: meetingId,
      user_id: currentUserId,
      status_type: "hand_raised",
    });

    toast({
      title: "Hand raised",
      description: "Host will be notified",
    });
  };

  const lowerHand = async () => {
    const myAttendee = attendees.find((a) => a.user_id === currentUserId);
    if (!myAttendee) return;

    const { error } = await supabase
      .from("meeting_attendees")
      .update({
        speaking_requested_at: null,
      })
      .eq("id", myAttendee.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to lower hand",
      });
      return;
    }

    await supabase.from("participant_status_log").insert({
      meeting_id: meetingId,
      user_id: currentUserId,
      status_type: "hand_lowered",
    });
  };

  const getRoleIcon = (role: string) => {
    if (role === "host" || role === "moderator") return <Crown className="h-3 w-3" />;
    if (role === "presenter") return <UserCheck className="h-3 w-3" />;
    return null;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      host: "default",
      moderator: "secondary",
      presenter: "outline",
    };
    return variants[role] || "outline";
  };

  const speakingRequests = attendees.filter((a) => a.speaking_requested_at);
  const currentSpeaker = attendees.find((a) => a.is_speaking);
  const myAttendee = attendees.find((a) => a.user_id === currentUserId);

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="font-semibold">Participants ({totalCount})</h3>
        </div>
        {!isHost && myAttendee && !myAttendee.speaking_requested_at && (
          <Button
            size="sm"
            variant="outline"
            onClick={raiseHand}
            disabled={myAttendee.can_speak}
          >
            <Hand className="h-4 w-4 mr-2" />
            Raise Hand
          </Button>
        )}
        {!isHost && myAttendee?.speaking_requested_at && (
          <Button size="sm" variant="ghost" onClick={lowerHand}>
            <Hand className="h-4 w-4 mr-2 fill-current" />
            Lower Hand
          </Button>
        )}
      </div>

      {/* Speaking Requests Alert */}
      {isHost && speakingRequests.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
            <Hand className="h-4 w-4" />
            {speakingRequests.length} participant(s) want to speak
          </div>
        </div>
      )}

      {/* Current Speaker */}
      {currentSpeaker && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-medium">Speaking:</span>
              <span className="text-sm">
                {currentSpeaker.profiles?.full_name}
              </span>
            </div>
            {isHost && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  revokeMicAccess(currentSpeaker.id, currentSpeaker.user_id)
                }
              >
                <MicOff className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Participants List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {attendees.map((attendee) => (
            <div
              key={attendee.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {attendee.profiles?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {attendee.profiles?.full_name}
                    </p>
                    {getRoleIcon(attendee.role)}
                    {attendee.user_id === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {attendee.role !== "participant" && (
                      <Badge variant={getRoleBadge(attendee.role)} className="text-xs">
                        {attendee.role}
                      </Badge>
                    )}
                    {attendee.attended && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-2">
                {attendee.speaking_requested_at && (
                  <Hand className="h-4 w-4 text-yellow-500 fill-current" />
                )}
                {attendee.is_speaking && (
                  <Mic className="h-4 w-4 text-primary animate-pulse" />
                )}
                {attendee.can_speak && !attendee.is_speaking && (
                  <Mic className="h-4 w-4 text-muted-foreground" />
                )}
                {!attendee.can_speak && !attendee.speaking_requested_at && (
                  <MicOff className="h-4 w-4 text-muted-foreground" />
                )}

                {/* Host Controls */}
                {isHost && attendee.user_id !== currentUserId && (
                  <div className="flex gap-1">
                    {attendee.speaking_requested_at && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          grantMicAccess(attendee.id, attendee.user_id)
                        }
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}
                    {attendee.can_speak && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          revokeMicAccess(attendee.id, attendee.user_id)
                        }
                      >
                        <MicOff className="h-4 w-4" />
                      </Button>
                    )}
                    {!attendee.can_speak && !attendee.speaking_requested_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          grantMicAccess(attendee.id, attendee.user_id)
                        }
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
