import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi, WifiOff } from "lucide-react";

interface UserPresence {
  user_id: string;
  full_name: string;
  online_at: string;
  status: "online" | "away" | "presenting";
}

interface RealTimePresenceProps {
  meetingId: string;
  currentUserId: string;
  currentUserName: string;
}

export function RealTimePresence({
  meetingId,
  currentUserId,
  currentUserName,
}: RealTimePresenceProps) {
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    const channel = supabase.channel(`meeting-presence-${meetingId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState<UserPresence>();
        // Flatten the presence state into an array
        const allPresences = Object.values(presenceState).flat();
        setOnlineUsers(allPresences);
        setConnectionStatus("connected");
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track own presence
          await channel.track({
            user_id: currentUserId,
            full_name: currentUserName,
            online_at: new Date().toISOString(),
            status: "online",
          });
        }
      });

    // Update presence every 30 seconds to show we're still active
    const intervalId = setInterval(() => {
      channel.track({
        user_id: currentUserId,
        full_name: currentUserName,
        online_at: new Date().toISOString(),
        status: "online",
      });
    }, 30000);

    return () => {
      clearInterval(intervalId);
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [meetingId, currentUserId, currentUserName]);

  const onlineCount = onlineUsers.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "presenting":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <h4 className="text-sm font-medium">Live Status</h4>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {onlineCount} online
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {onlineUsers.map((presence, index) => (
            <div
              key={`${presence.user_id}-${index}`}
              className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1"
            >
              <div className="relative">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {presence.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background ${getStatusColor(
                    presence.status
                  )}`}
                />
              </div>
              <span className="text-xs font-medium">
                {presence.full_name}
                {presence.user_id === currentUserId && " (You)"}
              </span>
            </div>
          ))}
        </div>

        {onlineCount === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Connecting to live status...
          </p>
        )}
      </div>
    </Card>
  );
}
