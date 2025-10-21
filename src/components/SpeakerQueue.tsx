import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  List,
  Play,
  SkipForward,
  CheckCircle2,
  Clock,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface QueueItem {
  id: string;
  user_id: string;
  queue_position: number;
  status: string;
  requested_at: string;
  time_limit_seconds: number | null;
  started_at: string | null;
  profiles: {
    full_name: string;
  };
}

interface SpeakerQueueProps {
  meetingId: string;
  isHost: boolean;
  currentUserId: string;
}

export function SpeakerQueue({
  meetingId,
  isHost,
  currentUserId,
}: SpeakerQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchQueue();

    // Real-time subscription
    const channel = supabase
      .channel(`speaker-queue-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "speaker_queue",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchQueue = async () => {
    // Fetch queue items
    const { data: queueData, error: queueError } = await supabase
      .from("speaker_queue")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("queue_position", { ascending: true });

    if (queueError) {
      console.error("Error fetching queue:", queueError);
      return;
    }

    if (!queueData || queueData.length === 0) {
      setQueue([]);
      return;
    }

    // Fetch profile data separately
    const userIds = queueData.map((item) => item.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return;
    }

    // Combine queue data with profiles
    const enrichedQueue = queueData.map((item) => ({
      ...item,
      profiles: profilesData?.find((p) => p.id === item.user_id) || { full_name: "Unknown" },
    }));

    setQueue(enrichedQueue);
  };

  const startSpeaking = async (queueItem: QueueItem) => {
    // Mark queue item as active
    const { error: queueError } = await supabase
      .from("speaker_queue")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("id", queueItem.id);

    if (queueError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start speaker",
      });
      return;
    }

    // Grant mic access
    const { error: attendeeError } = await supabase
      .from("meeting_attendees")
      .update({
        can_speak: true,
        is_speaking: true,
        microphone_granted_at: new Date().toISOString(),
        speaking_requested_at: null,
      })
      .eq("meeting_id", meetingId)
      .eq("user_id", queueItem.user_id);

    if (attendeeError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to grant microphone",
      });
      return;
    }

    toast({
      title: "Speaker started",
      description: `${queueItem.profiles?.full_name} is now speaking`,
    });
  };

  const skipSpeaker = async (queueItemId: string) => {
    const { error } = await supabase
      .from("speaker_queue")
      .update({ status: "skipped" })
      .eq("id", queueItemId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to skip speaker",
      });
      return;
    }

    // Move to next speaker automatically
    const nextPending = queue.find((q) => q.status === "pending" && q.id !== queueItemId);
    if (nextPending) {
      await startSpeaking(nextPending);
    }
  };

  const completeSpeaker = async (queueItemId: string, userId: string) => {
    const { error: queueError } = await supabase
      .from("speaker_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", queueItemId);

    if (queueError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete speaker",
      });
      return;
    }

    // Revoke mic access
    await supabase
      .from("meeting_attendees")
      .update({
        can_speak: false,
        is_speaking: false,
      })
      .eq("meeting_id", meetingId)
      .eq("user_id", userId);

    // Move to next speaker
    const nextPending = queue.find((q) => q.status === "pending");
    if (nextPending) {
      await startSpeaking(nextPending);
    }
  };

  const removeFromQueue = async (queueItemId: string) => {
    const { error } = await supabase
      .from("speaker_queue")
      .delete()
      .eq("id", queueItemId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove from queue",
      });
    }
  };

  const moveUp = async (item: QueueItem) => {
    if (item.queue_position === 1) return;

    const aboveItem = queue.find((q) => q.queue_position === item.queue_position - 1);
    if (!aboveItem) return;

    // Update positions directly
    const { error: error1 } = await supabase
      .from("speaker_queue")
      .update({ queue_position: item.queue_position })
      .eq("id", aboveItem.id);

    const { error: error2 } = await supabase
      .from("speaker_queue")
      .update({ queue_position: item.queue_position - 1 })
      .eq("id", item.id);

    if (error1 || error2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reorder queue",
      });
      return;
    }

    fetchQueue();
  };

  const moveDown = async (item: QueueItem) => {
    const belowItem = queue.find((q) => q.queue_position === item.queue_position + 1);
    if (!belowItem) return;

    // Update positions directly
    const { error: error1 } = await supabase
      .from("speaker_queue")
      .update({ queue_position: item.queue_position })
      .eq("id", belowItem.id);

    const { error: error2 } = await supabase
      .from("speaker_queue")
      .update({ queue_position: item.queue_position + 1 })
      .eq("id", item.id);

    if (error1 || error2) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reorder queue",
      });
      return;
    }

    fetchQueue();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Waiting" },
      active: { variant: "default", label: "Speaking" },
      completed: { variant: "secondary", label: "Completed" },
      skipped: { variant: "destructive", label: "Skipped" },
    };
    return variants[status] || { variant: "outline", label: status };
  };

  const pendingQueue = queue.filter((q) => q.status === "pending");
  const activeQueue = queue.filter((q) => q.status === "active");
  const completedQueue = queue.filter((q) => q.status === "completed" || q.status === "skipped");

  if (queue.length === 0 && !isHost) {
    return null;
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <List className="h-5 w-5" />
        <h3 className="font-semibold">Speaker Queue</h3>
        <Badge variant="secondary" className="ml-auto">
          {pendingQueue.length} waiting
        </Badge>
      </div>

      {/* Active Speaker */}
      {activeQueue.map((item) => (
        <div
          key={item.id}
          className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" />
              <span className="font-medium">{item.profiles?.full_name}</span>
              <Badge variant={getStatusBadge(item.status).variant}>
                {getStatusBadge(item.status).label}
              </Badge>
            </div>
            {item.time_limit_seconds && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {Math.floor(item.time_limit_seconds / 60)}m
              </div>
            )}
          </div>
          {isHost && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => completeSpeaker(item.id, item.user_id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => skipSpeaker(item.id)}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Pending Queue */}
      {pendingQueue.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Up Next:</p>
          {pendingQueue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-6">
                  #{item.queue_position}
                </span>
                <span className="text-sm">{item.profiles?.full_name}</span>
                {item.time_limit_seconds && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor(item.time_limit_seconds / 60)}m
                  </Badge>
                )}
              </div>
              {isHost && (
                <div className="flex gap-1">
                  {index === 0 && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => startSpeaking(item)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveUp(item)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  )}
                  {index < pendingQueue.length - 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveDown(item)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromQueue(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completedQueue.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Completed ({completedQueue.length})
          </summary>
          <div className="mt-2 space-y-1">
            {completedQueue.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">
                  {item.profiles?.full_name}
                </span>
                <Badge variant={getStatusBadge(item.status).variant} className="text-xs">
                  {getStatusBadge(item.status).label}
                </Badge>
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}
