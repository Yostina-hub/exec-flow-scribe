import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Mail, MessageSquare, Calendar, CheckSquare } from "lucide-react";

interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  meeting_reminders: boolean;
  meeting_reminder_time_minutes: number;
  action_item_reminders: boolean;
  action_item_reminder_days_before: number;
  daily_digest: boolean;
  weekly_summary: boolean;
  escalation_notifications: boolean;
}

export function NotificationPreferencesForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    sms_enabled: false,
    whatsapp_enabled: false,
    in_app_enabled: true,
    meeting_reminders: true,
    meeting_reminder_time_minutes: 30,
    action_item_reminders: true,
    action_item_reminder_days_before: 1,
    daily_digest: false,
    weekly_summary: true,
    escalation_notifications: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data as any);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure how and when you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notification Channels
          </h3>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="email">Email Notifications</Label>
              <Switch
                id="email"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, email_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sms">SMS Notifications</Label>
              <Switch
                id="sms"
                checked={preferences.sms_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, sms_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="whatsapp">WhatsApp Notifications</Label>
              <Switch
                id="whatsapp"
                checked={preferences.whatsapp_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, whatsapp_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="in-app">In-App Notifications</Label>
              <Switch
                id="in-app"
                checked={preferences.in_app_enabled}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, in_app_enabled: checked })
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Meeting Reminders
          </h3>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="meeting-reminders">Enable Meeting Reminders</Label>
              <Switch
                id="meeting-reminders"
                checked={preferences.meeting_reminders}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, meeting_reminders: checked })
                }
              />
            </div>

            {preferences.meeting_reminders && (
              <div className="space-y-2">
                <Label htmlFor="reminder-time">Reminder Time (minutes before)</Label>
                <Input
                  id="reminder-time"
                  type="number"
                  min="5"
                  max="1440"
                  value={preferences.meeting_reminder_time_minutes}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      meeting_reminder_time_minutes: parseInt(e.target.value) || 30,
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Action Item Reminders
          </h3>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="action-reminders">Enable Action Item Reminders</Label>
              <Switch
                id="action-reminders"
                checked={preferences.action_item_reminders}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, action_item_reminders: checked })
                }
              />
            </div>

            {preferences.action_item_reminders && (
              <div className="space-y-2">
                <Label htmlFor="action-reminder-days">Reminder (days before due date)</Label>
                <Input
                  id="action-reminder-days"
                  type="number"
                  min="0"
                  max="30"
                  value={preferences.action_item_reminder_days_before}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      action_item_reminder_days_before: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Digests & Summaries
          </h3>
          
          <div className="space-y-3 ml-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-digest">Daily Digest</Label>
              <Switch
                id="daily-digest"
                checked={preferences.daily_digest}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, daily_digest: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-summary">Weekly Summary</Label>
              <Switch
                id="weekly-summary"
                checked={preferences.weekly_summary}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, weekly_summary: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="escalations">Escalation Notifications</Label>
              <Switch
                id="escalations"
                checked={preferences.escalation_notifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, escalation_notifications: checked })
                }
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
