import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Mail, MessageSquare, Smartphone, Clock } from "lucide-react";

interface NotificationPreferences {
  new_assignment: boolean;
  due_date_24h: boolean;
  due_date_1h: boolean;
  status_change: boolean;
  overdue_escalation: boolean;
  reassignment: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export function TaskNotificationPreferences() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    new_assignment: true,
    due_date_24h: true,
    due_date_1h: true,
    status_change: true,
    overdue_escalation: true,
    reassignment: true,
    email_enabled: true,
    sms_enabled: false,
    whatsapp_enabled: false,
    in_app_enabled: true,
    quiet_hours_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("guba_notification_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const typedData = data as any;
        setPreferences({
          new_assignment: typedData.new_assignment,
          due_date_24h: typedData.due_date_24h,
          due_date_1h: typedData.due_date_1h,
          status_change: typedData.status_change,
          overdue_escalation: typedData.overdue_escalation,
          reassignment: typedData.reassignment,
          email_enabled: typedData.email_enabled,
          sms_enabled: typedData.sms_enabled,
          whatsapp_enabled: typedData.whatsapp_enabled,
          in_app_enabled: typedData.in_app_enabled,
          quiet_hours_enabled: typedData.quiet_hours_enabled,
          quiet_hours_start: typedData.quiet_hours_start,
          quiet_hours_end: typedData.quiet_hours_end,
        });
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
        .from("guba_notification_preferences" as any)
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: "✅ Preferences Saved",
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

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Task Notification Preferences
          </CardTitle>
          <CardDescription>
            Customize how and when you receive task notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Notification Types</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new_assignment">New Task Assignment</Label>
                  <p className="text-sm text-muted-foreground">
                    When a new task is assigned to you
                  </p>
                </div>
                <Switch
                  id="new_assignment"
                  checked={preferences.new_assignment}
                  onCheckedChange={(checked) => updatePreference("new_assignment", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="due_date_24h">24 Hour Reminder</Label>
                  <p className="text-sm text-muted-foreground">
                    Reminder 24 hours before due date
                  </p>
                </div>
                <Switch
                  id="due_date_24h"
                  checked={preferences.due_date_24h}
                  onCheckedChange={(checked) => updatePreference("due_date_24h", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="due_date_1h">1 Hour Reminder</Label>
                  <p className="text-sm text-muted-foreground">
                    Urgent reminder 1 hour before due date
                  </p>
                </div>
                <Switch
                  id="due_date_1h"
                  checked={preferences.due_date_1h}
                  onCheckedChange={(checked) => updatePreference("due_date_1h", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status_change">Status Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    When task status is updated
                  </p>
                </div>
                <Switch
                  id="status_change"
                  checked={preferences.status_change}
                  onCheckedChange={(checked) => updatePreference("status_change", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="overdue_escalation">Overdue Escalation</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when tasks become overdue
                  </p>
                </div>
                <Switch
                  id="overdue_escalation"
                  checked={preferences.overdue_escalation}
                  onCheckedChange={(checked) => updatePreference("overdue_escalation", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reassignment">Task Reassignment</Label>
                  <p className="text-sm text-muted-foreground">
                    When a task is reassigned to you
                  </p>
                </div>
                <Switch
                  id="reassignment"
                  checked={preferences.reassignment}
                  onCheckedChange={(checked) => updatePreference("reassignment", checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Channels */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Notification Channels</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="in_app">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications in the app
                    </p>
                  </div>
                </div>
                <Switch
                  id="in_app"
                  checked={preferences.in_app_enabled}
                  onCheckedChange={(checked) => updatePreference("in_app_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="email">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email"
                  checked={preferences.email_enabled}
                  onCheckedChange={(checked) => updatePreference("email_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="sms">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via SMS
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms"
                  checked={preferences.sms_enabled}
                  onCheckedChange={(checked) => updatePreference("sms_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="whatsapp">WhatsApp Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via WhatsApp
                    </p>
                  </div>
                </div>
                <Switch
                  id="whatsapp"
                  checked={preferences.whatsapp_enabled}
                  onCheckedChange={(checked) => updatePreference("whatsapp_enabled", checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="quiet_hours">Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Don't send notifications during these hours
                  </p>
                </div>
              </div>
              <Switch
                id="quiet_hours"
                checked={preferences.quiet_hours_enabled}
                onCheckedChange={(checked) => updatePreference("quiet_hours_enabled", checked)}
              />
            </div>

            {preferences.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4 pl-7">
                <div className="space-y-2">
                  <Label htmlFor="quiet_start">Start Time</Label>
                  <Input
                    id="quiet_start"
                    type="time"
                    value={preferences.quiet_hours_start || "22:00"}
                    onChange={(e) => updatePreference("quiet_hours_start", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet_end">End Time</Label>
                  <Input
                    id="quiet_end"
                    type="time"
                    value={preferences.quiet_hours_end || "08:00"}
                    onChange={(e) => updatePreference("quiet_hours_end", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
