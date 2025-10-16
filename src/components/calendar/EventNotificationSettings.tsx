import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  offset_minutes: number;
  channel: string;
  is_sent: boolean;
}

interface EventNotificationSettingsProps {
  meetingId: string;
  meetingTitle: string;
}

const NOTIFICATION_PRESETS = [
  { label: "At time of event", value: 0 },
  { label: "5 minutes before", value: 5 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
];

const CHANNELS = [
  { label: "In-app", value: "in_app" },
  { label: "Email", value: "email" },
];

export const EventNotificationSettings = ({ meetingId, meetingTitle }: EventNotificationSettingsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffset, setSelectedOffset] = useState<string>("15");
  const [selectedChannel, setSelectedChannel] = useState<string>("in_app");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [meetingId]);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("event_notifications")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("user_id", user.id)
        .order("offset_minutes");

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = async () => {
    try {
      setAdding(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("event_notifications")
        .insert({
          meeting_id: meetingId,
          user_id: user.id,
          offset_minutes: parseInt(selectedOffset),
          channel: selectedChannel,
        });

      if (error) throw error;

      toast.success("Reminder added");
      fetchNotifications();
    } catch (error: any) {
      console.error("Failed to add notification:", error);
      toast.error(error.message || "Failed to add reminder");
    } finally {
      setAdding(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("event_notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Reminder deleted");
      fetchNotifications();
    } catch (error: any) {
      console.error("Failed to delete notification:", error);
      toast.error(error.message || "Failed to delete reminder");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Event Reminders
        </CardTitle>
        <CardDescription>Set up notifications for {meetingTitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const preset = NOTIFICATION_PRESETS.find(p => p.value === notification.offset_minutes);
              const channel = CHANNELS.find(c => c.value === notification.channel);
              
              return (
                <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{preset?.label || `${notification.offset_minutes} minutes before`}</span>
                    <Badge variant="outline" className="text-xs">{channel?.label || notification.channel}</Badge>
                    {notification.is_sent && (
                      <Badge variant="secondary" className="text-xs">Sent</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNotification(notification.id)}
                    disabled={notification.is_sent}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Select value={selectedOffset} onValueChange={setSelectedOffset}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value.toString()}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((channel) => (
                <SelectItem key={channel.value} value={channel.value}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={addNotification} disabled={adding} size="icon">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
