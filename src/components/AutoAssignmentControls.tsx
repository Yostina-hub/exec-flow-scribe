import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Play, Square, Clock } from "lucide-react";

interface AutoAssignmentControlsProps {
  meetingId: string;
  isHost: boolean;
}

export function AutoAssignmentControls({ meetingId, isHost }: AutoAssignmentControlsProps) {
  const [settings, setSettings] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, [meetingId]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("meeting_settings")
      .select("*")
      .eq("meeting_id", meetingId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching settings:", error);
      return;
    }

    if (data) {
      setSettings(data);
      setIsActive(data.auto_assignment_enabled);
    } else {
      // Create default settings
      const { data: newSettings, error: createError } = await supabase
        .from("meeting_settings")
        .insert({
          meeting_id: meetingId,
          auto_assignment_enabled: false,
          auto_assignment_mode: "sequential",
          default_speaking_time_seconds: 300,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating settings:", createError);
        return;
      }

      setSettings(newSettings);
    }
  };

  const updateSettings = async (updates: any) => {
    const { error } = await supabase
      .from("meeting_settings")
      .update(updates)
      .eq("meeting_id", meetingId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings",
      });
      return;
    }

    setSettings({ ...settings, ...updates });
    toast({
      title: "Settings updated",
      description: "Auto-assignment configuration saved",
    });
  };

  const startAutoMode = async () => {
    // Get all pending speakers in queue
    const { data: queue, error: queueError } = await supabase
      .from("speaker_queue")
      .select("*")
      .eq("meeting_id", meetingId)
      .eq("status", "pending")
      .order("queue_position");

    if (queueError || !queue || queue.length === 0) {
      toast({
        variant: "destructive",
        title: "Cannot start",
        description: "No speakers in queue. Add participants to the queue first.",
      });
      return;
    }

    // Start with first speaker
    const firstSpeaker = queue[0];
    
    // Update queue item
    await supabase
      .from("speaker_queue")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("id", firstSpeaker.id);

    // Grant mic access
    await supabase
      .from("meeting_attendees")
      .update({
        can_speak: false,
        is_speaking: false,
      })
      .eq("meeting_id", meetingId);

    await supabase
      .from("meeting_attendees")
      .update({
        can_speak: true,
        is_speaking: true,
        microphone_granted_at: new Date().toISOString(),
      })
      .eq("meeting_id", meetingId)
      .eq("user_id", firstSpeaker.user_id);

    // Enable auto-assignment
    await updateSettings({ auto_assignment_enabled: true });
    setIsActive(true);

    toast({
      title: "Auto-assignment started",
      description: `${settings?.auto_assignment_mode} mode activated`,
    });

    // Set up auto-rotation timer if time-boxed mode
    if (settings?.auto_assignment_mode === "time_boxed") {
      scheduleNextSpeaker(firstSpeaker.id, settings.default_speaking_time_seconds);
    }
  };

  const stopAutoMode = async () => {
    await updateSettings({ auto_assignment_enabled: false });
    setIsActive(false);

    toast({
      title: "Auto-assignment stopped",
      description: "Manual control resumed",
    });
  };

  const scheduleNextSpeaker = async (currentSpeakerId: string, timeSeconds: number) => {
    setTimeout(async () => {
      // Check if still in auto mode
      const { data: currentSettings } = await supabase
        .from("meeting_settings")
        .select("auto_assignment_enabled")
        .eq("meeting_id", meetingId)
        .single();

      if (!currentSettings?.auto_assignment_enabled) return;

      // Complete current speaker
      const { data: currentSpeaker } = await supabase
        .from("speaker_queue")
        .select("user_id")
        .eq("id", currentSpeakerId)
        .single();

      await supabase
        .from("speaker_queue")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", currentSpeakerId);

      if (currentSpeaker) {
        await supabase
          .from("meeting_attendees")
          .update({
            can_speak: false,
            is_speaking: false,
          })
          .eq("meeting_id", meetingId)
          .eq("user_id", currentSpeaker.user_id);
      }

      // Get next speaker
      const { data: nextSpeakers } = await supabase
        .from("speaker_queue")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("status", "pending")
        .order("queue_position")
        .limit(1);

      if (nextSpeakers && nextSpeakers.length > 0) {
        const nextSpeaker = nextSpeakers[0];

        await supabase
          .from("speaker_queue")
          .update({
            status: "active",
            started_at: new Date().toISOString(),
          })
          .eq("id", nextSpeaker.id);

        await supabase
          .from("meeting_attendees")
          .update({
            can_speak: true,
            is_speaking: true,
            microphone_granted_at: new Date().toISOString(),
          })
          .eq("meeting_id", meetingId)
          .eq("user_id", nextSpeaker.user_id);

        // Schedule next rotation
        scheduleNextSpeaker(nextSpeaker.id, timeSeconds);
      } else {
        // No more speakers, stop auto mode
        await stopAutoMode();
      }
    }, timeSeconds * 1000);
  };

  if (!isHost) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Auto-Assignment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-mode">Auto-Assignment Mode</Label>
          <div className="flex items-center gap-2">
            {isActive ? (
              <Button onClick={stopAutoMode} variant="destructive" size="sm">
                <Square className="h-4 w-4 mr-2" />
                Stop Auto Mode
              </Button>
            ) : (
              <Button onClick={startAutoMode} variant="default" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Start Auto Mode
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mode-select">Assignment Mode</Label>
          <Select
            value={settings?.auto_assignment_mode || "sequential"}
            onValueChange={(value) => updateSettings({ auto_assignment_mode: value })}
            disabled={isActive}
          >
            <SelectTrigger id="mode-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sequential">Sequential - Follow queue order</SelectItem>
              <SelectItem value="round_robin">Round Robin - Equal time for all</SelectItem>
              <SelectItem value="time_boxed">Time-Boxed - Auto-rotate after time limit</SelectItem>
              <SelectItem value="priority">Priority - Based on role/urgency</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {settings?.auto_assignment_mode === "sequential" &&
              "Speakers will be called in the order they appear in the queue"}
            {settings?.auto_assignment_mode === "round_robin" &&
              "Each speaker gets equal speaking time in rotation"}
            {settings?.auto_assignment_mode === "time_boxed" &&
              "Automatically switch to next speaker after time limit"}
            {settings?.auto_assignment_mode === "priority" &&
              "Higher priority speakers (by role) speak first"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time-limit" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Default Speaking Time (minutes)
          </Label>
          <Input
            id="time-limit"
            type="number"
            min="1"
            max="60"
            value={Math.floor((settings?.default_speaking_time_seconds || 300) / 60)}
            onChange={(e) =>
              updateSettings({
                default_speaking_time_seconds: parseInt(e.target.value) * 60,
              })
            }
            disabled={isActive}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="host-approval">Require Host Approval</Label>
          <Switch
            id="host-approval"
            checked={settings?.require_host_approval ?? true}
            onCheckedChange={(checked) =>
              updateSettings({ require_host_approval: checked })
            }
            disabled={isActive}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="mute-on-join">Mute Participants on Join</Label>
          <Switch
            id="mute-on-join"
            checked={settings?.mute_on_join ?? true}
            onCheckedChange={(checked) => updateSettings({ mute_on_join: checked })}
            disabled={isActive}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="hand-raise">Allow Hand Raise</Label>
          <Switch
            id="hand-raise"
            checked={settings?.allow_hand_raise ?? true}
            onCheckedChange={(checked) =>
              updateSettings({ allow_hand_raise: checked })
            }
            disabled={isActive}
          />
        </div>
      </CardContent>
    </Card>
  );
}
