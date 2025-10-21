import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

interface NotificationPreference {
  id: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  notify_meeting_start: boolean;
  notify_meeting_reminder_minutes: number;
  notify_hand_raised: boolean;
  notify_mic_granted: boolean;
  notify_action_assigned: boolean;
  notify_action_due: boolean;
  notify_mention: boolean;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const { toast } = useToast();

  const notificationTypes = [
    { key: "notify_meeting_start", label: "Meeting Started" },
    { key: "notify_hand_raised", label: "Hand Raised" },
    { key: "notify_mic_granted", label: "Microphone Granted" },
    { key: "notify_action_assigned", label: "Action Item Assigned" },
    { key: "notify_action_due", label: "Action Item Due" },
    { key: "notify_mention", label: "Mentioned in Meeting" },
  ];

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching preferences:", error);
      return;
    }

    // Create default preferences if none exist
    if (!data || data.length === 0) {
      const defaultPref = {
        user_id: user.id,
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        notify_meeting_start: true,
        notify_meeting_reminder_minutes: 15,
        notify_hand_raised: true,
        notify_mic_granted: true,
        notify_action_assigned: true,
        notify_action_due: true,
        notify_mention: true,
      };

      const { data: created, error: insertError } = await supabase
        .from("notification_preferences")
        .insert(defaultPref)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating preferences:", insertError);
        return;
      }

      setPreferences(created ? [created] : []);
    } else {
      setPreferences(data);
    }
  };

  const updatePreference = async (
    id: string,
    field: keyof NotificationPreference,
    value: any
  ) => {
    const { error } = await supabase
      .from("notification_preferences")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update notification preference",
        variant: "destructive",
      });
      return;
    }

    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

    toast({
      title: "Updated",
      description: "Notification preference saved",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {preferences.length > 0 && preferences.map((pref) => (
          <div key={pref.id} className="space-y-4">
            <div className="space-y-4">
              {notificationTypes.map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <Label htmlFor={`${type.key}-${pref.id}`} className="text-sm">
                    {type.label}
                  </Label>
                  <Switch
                    id={`${type.key}-${pref.id}`}
                    checked={pref[type.key as keyof NotificationPreference] as boolean}
                    onCheckedChange={(checked) =>
                      updatePreference(pref.id, type.key as keyof NotificationPreference, checked)
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-medium">Notification Channels</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`email-${pref.id}`} className="text-sm">
                    Email Notifications
                  </Label>
                  <Switch
                    id={`email-${pref.id}`}
                    checked={pref.email_enabled}
                    onCheckedChange={(checked) =>
                      updatePreference(pref.id, "email_enabled", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`sms-${pref.id}`} className="text-sm">
                    SMS Notifications
                  </Label>
                  <Switch
                    id={`sms-${pref.id}`}
                    checked={pref.sms_enabled}
                    onCheckedChange={(checked) =>
                      updatePreference(pref.id, "sms_enabled", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor={`push-${pref.id}`} className="text-sm">
                    Push Notifications
                  </Label>
                  <Switch
                    id={`push-${pref.id}`}
                    checked={pref.push_enabled}
                    onCheckedChange={(checked) =>
                      updatePreference(pref.id, "push_enabled", checked)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor={`reminder-${pref.id}`} className="text-sm">
                Meeting Reminder (minutes before)
              </Label>
              <Select
                value={pref.notify_meeting_reminder_minutes.toString()}
                onValueChange={(value) =>
                  updatePreference(pref.id, "notify_meeting_reminder_minutes", parseInt(value))
                }
              >
                <SelectTrigger id={`reminder-${pref.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
