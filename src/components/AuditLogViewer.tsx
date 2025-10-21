import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, User, Mic, Settings, Video, UserX, Clock } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  action_details: any;
  timestamp: string;
  profiles?: {
    full_name: string;
  };
}

interface AuditLogViewerProps {
  meetingId: string;
}

export function AuditLogViewer({ meetingId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();

    // Real-time subscription for new logs
    const channel = supabase
      .channel(`audit-logs-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchLogs = async () => {
    try {
      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("timestamp", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      // Fetch profiles separately
      const userIds = [...new Set(logsData.map((log) => log.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine logs with profiles
      const enrichedLogs = logsData.map((log) => ({
        ...log,
        profiles: profilesData?.find((p) => p.id === log.user_id) || { full_name: "Unknown User" },
      }));

      setLogs(enrichedLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "joined":
        return <User className="h-4 w-4" />;
      case "left":
        return <UserX className="h-4 w-4" />;
      case "mic_granted":
      case "mic_revoked":
        return <Mic className="h-4 w-4" />;
      case "settings_updated":
        return <Settings className="h-4 w-4" />;
      case "recording_started":
      case "recording_stopped":
      case "recording_consent_given":
        return <Video className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    return actionType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("granted") || actionType.includes("joined") || actionType.includes("started")) {
      return "default";
    }
    if (actionType.includes("revoked") || actionType.includes("left") || actionType.includes("stopped")) {
      return "secondary";
    }
    if (actionType.includes("consent")) {
      return "outline";
    }
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Activity Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Loading audit logs...
          </p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity logged yet
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">{getActionIcon(log.action_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {log.profiles?.full_name}
                      </p>
                      <Badge variant={getActionColor(log.action_type) as any} className="text-xs">
                        {getActionLabel(log.action_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "PPp")}
                      </p>
                    </div>
                    {log.action_details && Object.keys(log.action_details).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="text-xs bg-background p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(log.action_details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
