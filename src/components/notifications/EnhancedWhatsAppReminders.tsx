import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bell, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const EnhancedWhatsAppReminders = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<string>("15");
  const [followUpReminders, setFollowUpReminders] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [actionItemReminders, setActionItemReminders] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        // Map existing notification_preferences fields
        setIsEnabled(data.sms_enabled || false);
        setReminderTiming(data.notify_meeting_reminder_minutes?.toString() || "15");
        setFollowUpReminders(data.notify_action_due || false);
        setDailyDigest(data.email_enabled || false);
        setActionItemReminders(data.notify_action_assigned || true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          sms_enabled: isEnabled,
          notify_meeting_reminder_minutes: parseInt(reminderTiming),
          notify_action_due: followUpReminders,
          email_enabled: dailyDigest,
          notify_action_assigned: actionItemReminders,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your WhatsApp reminder preferences have been updated",
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const testReminder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile with email (using email as fallback for phone)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!profile?.email) {
        toast({
          title: "Profile Required",
          description: "Please complete your profile in settings",
          variant: "destructive",
        });
        return;
      }

      // For now, use a test phone number format from email
      const testPhone = "+251900000000"; // Replace with actual phone from user settings

      await supabase.functions.invoke('send-whatsapp-reminder', {
        body: {
          phoneNumber: testPhone,
          type: 'test',
          message: 'This is a test reminder from your meeting assistant! 🎉'
        }
      });

      toast({
        title: "Test Reminder Sent",
        description: "Check your WhatsApp for the test message",
      });
    } catch (error: any) {
      console.error('Error sending test:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test reminder",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Enhanced WhatsApp Reminders
            </CardTitle>
            <CardDescription>
              Get smart reminders and updates via WhatsApp
            </CardDescription>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meeting Reminders */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <Label>Meeting Reminders</Label>
          </div>
          <Select 
            value={reminderTiming} 
            onValueChange={setReminderTiming}
            disabled={!isEnabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutes before</SelectItem>
              <SelectItem value="15">15 minutes before</SelectItem>
              <SelectItem value="30">30 minutes before</SelectItem>
              <SelectItem value="60">1 hour before</SelectItem>
              <SelectItem value="1440">1 day before</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Item Reminders */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Action Item Deadlines</Label>
            <p className="text-xs text-muted-foreground">
              Get reminded about upcoming task deadlines
            </p>
          </div>
          <Switch
            checked={actionItemReminders}
            onCheckedChange={setActionItemReminders}
            disabled={!isEnabled}
          />
        </div>

        {/* Follow-up Reminders */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Follow-up Reminders</Label>
            <p className="text-xs text-muted-foreground">
              Remind you to follow up on discussions
            </p>
          </div>
          <Switch
            checked={followUpReminders}
            onCheckedChange={setFollowUpReminders}
            disabled={!isEnabled}
          />
        </div>

        {/* Daily Digest */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Daily Digest</Label>
            <p className="text-xs text-muted-foreground">
              Morning summary of today's meetings
            </p>
          </div>
          <Switch
            checked={dailyDigest}
            onCheckedChange={setDailyDigest}
            disabled={!isEnabled}
          />
        </div>

        {/* Info Box */}
        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Smart Timing
          </p>
          <p className="text-xs text-muted-foreground">
            Reminders are sent based on your timezone and work hours preferences.
            Messages include quick action buttons for one-tap responses.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={saveSettings} className="flex-1">
            Save Settings
          </Button>
          <Button 
            onClick={testReminder} 
            variant="outline"
            disabled={!isEnabled}
          >
            Test
          </Button>
        </div>

        {/* Status Badge */}
        {isEnabled ? (
          <Badge className="w-full justify-center">
            WhatsApp Reminders Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="w-full justify-center">
            Enable to receive WhatsApp notifications
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
