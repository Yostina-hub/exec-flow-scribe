import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Clock, MessageSquare, TrendingUp, Award } from "lucide-react";

interface MeetingAnalyticsProps {
  meetingId: string;
}

interface ParticipantStats {
  user_id: string;
  full_name: string;
  speaking_time: number;
  messages_sent: number;
  hand_raises: number;
  attended: boolean;
}

export function MeetingAnalytics({ meetingId }: MeetingAnalyticsProps) {
  const [analytics, setAnalytics] = useState<{
    totalParticipants: number;
    activeParticipants: number;
    totalSpeakingTime: number;
    totalMessages: number;
    participantStats: ParticipantStats[];
    engagementRate: number;
  }>({
    totalParticipants: 0,
    activeParticipants: 0,
    totalSpeakingTime: 0,
    totalMessages: 0,
    participantStats: [],
    engagementRate: 0,
  });

  useEffect(() => {
    fetchAnalytics();

    // Real-time updates
    const channel = supabase
      .channel(`meeting-analytics-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participant_status_log",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchAnalytics = async () => {
    // Fetch all attendees
    const { data: attendees, error: attendeesError } = await supabase
      .from("meeting_attendees")
      .select(`
        user_id,
        attended,
        speaking_duration_seconds,
        profiles:user_id (
          full_name
        )
      `)
      .eq("meeting_id", meetingId);

    if (attendeesError) {
      console.error("Error fetching attendees:", attendeesError);
      return;
    }

    // Fetch participant status logs
    const { data: statusLogs, error: logsError } = await supabase
      .from("participant_status_log")
      .select("user_id, status_type")
      .eq("meeting_id", meetingId);

    if (logsError) {
      console.error("Error fetching status logs:", logsError);
      return;
    }

    // Fetch chat messages
    const { data: messages, error: messagesError } = await supabase
      .from("meeting_chat_messages")
      .select("user_id")
      .eq("meeting_id", meetingId)
      .neq("role", "assistant");

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return;
    }

    // Fetch profiles separately
    const userIds = attendees?.map((a) => a.user_id) || [];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return;
    }

    // Calculate stats per participant
    const participantStats: ParticipantStats[] = (attendees || []).map((attendee) => {
      const profile = profiles?.find((p) => p.id === attendee.user_id);
      const handRaises = statusLogs?.filter(
        (log) => log.user_id === attendee.user_id && log.status_type === "hand_raised"
      ).length || 0;
      const messageCount = messages?.filter(
        (msg) => msg.user_id === attendee.user_id
      ).length || 0;

      return {
        user_id: attendee.user_id,
        full_name: profile?.full_name || "Unknown",
        speaking_time: attendee.speaking_duration_seconds || 0,
        messages_sent: messageCount,
        hand_raises: handRaises,
        attended: attendee.attended || false,
      };
    });

    const totalSpeakingTime = participantStats.reduce(
      (sum, p) => sum + p.speaking_time,
      0
    );
    const activeParticipants = participantStats.filter(
      (p) => p.speaking_time > 0 || p.messages_sent > 0
    ).length;
    const totalMessages = messages?.length || 0;

    // Engagement rate: participants who actively participated / total participants
    const engagementRate = attendees && attendees.length > 0
      ? (activeParticipants / attendees.length) * 100
      : 0;

    setAnalytics({
      totalParticipants: attendees?.length || 0,
      activeParticipants,
      totalSpeakingTime,
      totalMessages,
      participantStats: participantStats.sort((a, b) => b.speaking_time - a.speaking_time),
      engagementRate,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getMostEngaged = () => {
    if (analytics.participantStats.length === 0) return null;
    return analytics.participantStats.reduce((prev, current) =>
      prev.speaking_time + prev.messages_sent > current.speaking_time + current.messages_sent
        ? prev
        : current
    );
  };

  const mostEngaged = getMostEngaged();

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Participants</p>
            </div>
            <p className="text-2xl font-bold mt-2">{analytics.totalParticipants}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.activeParticipants} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Engagement Rate</p>
            </div>
            <p className="text-2xl font-bold mt-2">
              {analytics.engagementRate.toFixed(0)}%
            </p>
            <Progress value={analytics.engagementRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Speaking Time</p>
            </div>
            <p className="text-2xl font-bold mt-2">
              {formatTime(analytics.totalSpeakingTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Chat Messages</p>
            </div>
            <p className="text-2xl font-bold mt-2">{analytics.totalMessages}</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Engaged Participant */}
      {mostEngaged && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-yellow-500" />
              Most Engaged Participant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{mostEngaged.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(mostEngaged.speaking_time)} speaking •{" "}
                  {mostEngaged.messages_sent} messages
                </p>
              </div>
              <Badge variant="default" className="bg-yellow-500">
                Top Contributor
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participant Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Participation Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.participantStats.map((participant) => {
              const totalContribution = participant.speaking_time + participant.messages_sent * 10;
              const maxContribution = Math.max(
                ...analytics.participantStats.map(
                  (p) => p.speaking_time + p.messages_sent * 10
                )
              );
              const percentage = maxContribution > 0
                ? (totalContribution / maxContribution) * 100
                : 0;

              return (
                <div key={participant.user_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{participant.full_name}</p>
                      {participant.attended && (
                        <Badge variant="outline" className="text-xs">
                          Attended
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(participant.speaking_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {participant.messages_sent}
                      </span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            {analytics.participantStats.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No participation data yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
