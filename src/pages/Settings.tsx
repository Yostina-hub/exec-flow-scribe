import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Calendar, Mic, Shield, User, Brain, Palette, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIProviderSettings } from "@/components/AIProviderSettings";
import { TranscriptionSettings } from "@/components/TranscriptionSettings";
import { RoleAssignmentManager } from "@/components/settings/RoleAssignmentManager";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { BrandKitManager } from "@/components/pdf/BrandKitManager";
import { DistributionManager } from "@/components/pdf/DistributionManager";
import { SMTPSettings } from "@/components/settings/SMTPSettings";
import { CommunicationSettings } from "@/components/settings/CommunicationSettings";
import { GoogleAPISettings } from "@/components/settings/GoogleAPISettings";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    title: "",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    meeting_reminders: true,
    action_item_updates: true,
    minutes_ready: true,
    daily_digest: false,
    reminder_timing: 15,
  });
  const [meetingSettings, setMeetingSettings] = useState({
    default_duration: 60,
    default_location: "Board Room",
    calendar_sync: "google",
    auto_schedule_followup: false,
    enable_virtual_links: true,
  });
  const [recordingSettings, setRecordingSettings] = useState({
    audio_quality: "high",
    transcription_language: "en",
    auto_start_recording: false,
    speaker_diarization: true,
    auto_generate_summary: true,
  });
  const [securitySettings, setSecuritySettings] = useState({
    data_retention_period: "1year",
    two_factor_enabled: false,
    encrypt_recordings: true,
    activity_logging: true,
  });

  useEffect(() => {
    fetchProfile();
    fetchNotificationSettings();
    fetchMeetingSettings();
    fetchRecordingSettings();
    fetchSecuritySettings();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || user.email || "",
          title: data.title || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          title: profile.title,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.notification_preferences) {
        const prefs = data.notification_preferences as Record<string, any>;
        setNotificationSettings({
          meeting_reminders: prefs.meeting_reminders ?? true,
          action_item_updates: prefs.action_item_updates ?? true,
          minutes_ready: prefs.minutes_ready ?? true,
          daily_digest: prefs.daily_digest ?? false,
          reminder_timing: prefs.reminder_timing ?? 15,
        });
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error);
    }
  };

  const fetchMeetingSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("meeting_preferences")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.meeting_preferences) {
        const prefs = data.meeting_preferences as Record<string, any>;
        setMeetingSettings({
          default_duration: prefs.default_duration ?? 60,
          default_location: prefs.default_location ?? "Board Room",
          calendar_sync: prefs.calendar_sync ?? "google",
          auto_schedule_followup: prefs.auto_schedule_followup ?? false,
          enable_virtual_links: prefs.enable_virtual_links ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching meeting settings:", error);
    }
  };

  const fetchRecordingSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("recording_preferences")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.recording_preferences) {
        const prefs = data.recording_preferences as Record<string, any>;
        setRecordingSettings({
          audio_quality: prefs.audio_quality ?? "high",
          transcription_language: prefs.transcription_language ?? "en",
          auto_start_recording: prefs.auto_start_recording ?? false,
          speaker_diarization: prefs.speaker_diarization ?? true,
          auto_generate_summary: prefs.auto_generate_summary ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching recording settings:", error);
    }
  };

  const handleNotificationUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: notificationSettings,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error("Error updating notifications:", error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMeetingUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          meeting_preferences: meetingSettings,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Meeting settings updated",
        description: "Your meeting preferences have been saved",
      });
    } catch (error) {
      console.error("Error updating meeting settings:", error);
      toast({
        title: "Error",
        description: "Failed to update meeting preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRecordingUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          recording_preferences: recordingSettings,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Recording settings updated",
        description: "Your recording preferences have been saved",
      });
    } catch (error) {
      console.error("Error updating recording settings:", error);
      toast({
        title: "Error",
        description: "Failed to update recording preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("security_preferences")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.security_preferences) {
        const prefs = data.security_preferences as Record<string, any>;
        setSecuritySettings({
          data_retention_period: prefs.data_retention_period ?? "1year",
          two_factor_enabled: prefs.two_factor_enabled ?? false,
          encrypt_recordings: prefs.encrypt_recordings ?? true,
          activity_logging: prefs.activity_logging ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching security settings:", error);
    }
  };

  const handleSecurityUpdate = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          security_preferences: securitySettings,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Security settings updated",
        description: "Your security preferences have been saved",
      });
    } catch (error) {
      console.error("Error updating security settings:", error);
      toast({
        title: "Error",
        description: "Failed to update security preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully",
    });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and application settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="inline-flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
            <TabsTrigger value="ai-provider">AI Provider</TabsTrigger>
            <TabsTrigger value="google-api">Google API</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="escalation">Escalation</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20 bg-gradient-to-br from-primary to-secondary">
                        <AvatarFallback className="bg-transparent text-white text-2xl">
                          {profile.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" disabled>
                          Change Photo
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG or GIF. Max size 2MB
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profile.full_name}
                          onChange={(e) =>
                            setProfile({ ...profile, full_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={profile.title}
                          onChange={(e) =>
                            setProfile({ ...profile, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={fetchProfile}>
                        Reset
                      </Button>
                      <Button onClick={handleProfileUpdate} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to be notified about meeting updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Meeting Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified before meetings start
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.meeting_reminders}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          meeting_reminders: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Action Item Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications when action items are assigned or completed
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.action_item_updates}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          action_item_updates: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Meeting Minutes Ready</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when AI-generated minutes are available
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.minutes_ready}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          minutes_ready: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Digest</Label>
                      <p className="text-sm text-muted-foreground">
                        Daily summary of meetings and action items
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.daily_digest}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          daily_digest: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Reminder Timing</Label>
                  <Select
                    value={notificationSettings.reminder_timing.toString()}
                    onValueChange={(value) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        reminder_timing: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={fetchNotificationSettings}>
                    Reset
                  </Button>
                  <Button onClick={handleNotificationUpdate} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Meeting Settings
                </CardTitle>
                <CardDescription>
                  Configure default meeting preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Meeting Duration</Label>
                    <Select
                      value={meetingSettings.default_duration.toString()}
                      onValueChange={(value) =>
                        setMeetingSettings({
                          ...meetingSettings,
                          default_duration: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">120 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Location</Label>
                    <Input
                      value={meetingSettings.default_location}
                      onChange={(e) =>
                        setMeetingSettings({
                          ...meetingSettings,
                          default_location: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Calendar Sync</Label>
                    <Select
                      value={meetingSettings.calendar_sync}
                      onValueChange={(value) =>
                        setMeetingSettings({
                          ...meetingSettings,
                          calendar_sync: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Calendar</SelectItem>
                        <SelectItem value="outlook">Outlook Calendar</SelectItem>
                        <SelectItem value="apple">Apple Calendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-schedule follow-up meetings</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create follow-up meetings based on action items
                      </p>
                    </div>
                    <Switch
                      checked={meetingSettings.auto_schedule_followup}
                      onCheckedChange={(checked) =>
                        setMeetingSettings({
                          ...meetingSettings,
                          auto_schedule_followup: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable virtual meeting links</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically generate video conferencing links
                      </p>
                    </div>
                    <Switch
                      checked={meetingSettings.enable_virtual_links}
                      onCheckedChange={(checked) =>
                        setMeetingSettings({
                          ...meetingSettings,
                          enable_virtual_links: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={fetchMeetingSettings}>
                    Reset
                  </Button>
                  <Button onClick={handleMeetingUpdate} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recording Tab */}
          <TabsContent value="recording" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Recording & Transcription
                </CardTitle>
                <CardDescription>
                  Configure audio recording and AI transcription settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Audio Quality</Label>
                    <Select
                      value={recordingSettings.audio_quality}
                      onValueChange={(value) =>
                        setRecordingSettings({
                          ...recordingSettings,
                          audio_quality: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (16 kHz)</SelectItem>
                        <SelectItem value="high">High (24 kHz)</SelectItem>
                        <SelectItem value="ultra">Ultra (48 kHz)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Transcription Language</Label>
                    <Select
                      value={recordingSettings.transcription_language}
                      onValueChange={(value) =>
                        setRecordingSettings({
                          ...recordingSettings,
                          transcription_language: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-start recording</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically start recording when meeting begins
                      </p>
                    </div>
                    <Switch
                      checked={recordingSettings.auto_start_recording}
                      onCheckedChange={(checked) =>
                        setRecordingSettings({
                          ...recordingSettings,
                          auto_start_recording: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Speaker diarization</Label>
                      <p className="text-sm text-muted-foreground">
                        Identify and label different speakers in transcription
                      </p>
                    </div>
                    <Switch
                      checked={recordingSettings.speaker_diarization}
                      onCheckedChange={(checked) =>
                        setRecordingSettings({
                          ...recordingSettings,
                          speaker_diarization: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-generate summary</Label>
                      <p className="text-sm text-muted-foreground">
                        AI-powered meeting summary and action item extraction
                      </p>
                    </div>
                    <Switch
                      checked={recordingSettings.auto_generate_summary}
                      onCheckedChange={(checked) =>
                        setRecordingSettings({
                          ...recordingSettings,
                          auto_generate_summary: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={fetchRecordingSettings}>
                    Reset
                  </Button>
                  <Button onClick={handleRecordingUpdate} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transcription Tab */}
          <TabsContent value="transcription" className="space-y-6">
            <TranscriptionSettings />
          </TabsContent>

          {/* AI Provider Tab */}
          <TabsContent value="ai-provider" className="space-y-6">
            <AIProviderSettings />
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-6">
            <SMTPSettings />
          </TabsContent>

          {/* Escalation Tab */}
          <TabsContent value="escalation" className="space-y-6">
            <RoleAssignmentManager />
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <AutomationSettings />
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <CommunicationSettings />
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <BrandKitManager />
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <DistributionManager />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Privacy
                </CardTitle>
                <CardDescription>
                  Manage security settings and data retention policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Data Retention Period</Label>
                    <Select
                      value={securitySettings.data_retention_period}
                      onValueChange={(value) =>
                        setSecuritySettings({
                          ...securitySettings,
                          data_retention_period: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3months">3 months</SelectItem>
                        <SelectItem value="6months">6 months</SelectItem>
                        <SelectItem value="1year">1 year</SelectItem>
                        <SelectItem value="2years">2 years</SelectItem>
                        <SelectItem value="indefinite">Indefinite</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How long to keep recordings and transcriptions
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-factor authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.two_factor_enabled}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          two_factor_enabled: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Encrypt recordings</Label>
                      <p className="text-sm text-muted-foreground">
                        End-to-end encryption for sensitive meeting data
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.encrypt_recordings}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          encrypt_recordings: checked,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Activity logging</Label>
                      <p className="text-sm text-muted-foreground">
                        Track all actions performed in the system
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.activity_logging}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({
                          ...securitySettings,
                          activity_logging: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Button variant="outline" className="w-full" disabled>
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full" disabled>
                    Download My Data
                  </Button>
                  <Button variant="destructive" className="w-full" disabled>
                    Delete Account
                  </Button>
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={fetchSecuritySettings}>
                    Reset
                  </Button>
                  <Button onClick={handleSecurityUpdate} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Google API Tab */}
          <TabsContent value="google-api">
            <GoogleAPISettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
