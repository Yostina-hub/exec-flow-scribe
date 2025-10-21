import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Clock, Eye, Brain, FileText } from "lucide-react";
import { useIsSeniorRole } from "@/hooks/useMeetingAccess";

interface MeetingAccessManagerProps {
  meetingId: string;
  userId: string;
  userName: string;
}

/**
 * Component for managing granular access control for meeting participants
 * Allows senior roles to configure time-based and element-level permissions
 */
export function MeetingAccessManager({ meetingId, userId, userName }: MeetingAccessManagerProps) {
  const { toast } = useToast();
  const { isSeniorRole, loading: roleLoading } = useIsSeniorRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessControl, setAccessControl] = useState({
    access_type: "participant" as "host" | "admin" | "participant",
    can_access_recordings: false,
    can_access_transcriptions: false,
    can_use_ai_tools: false,
    can_view_analytics: false,
    can_manage_documents: false,
    time_limited: true,
  });

  useEffect(() => {
    fetchAccessControl();
  }, [meetingId, userId]);

  const fetchAccessControl = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_access_control" as any)
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAccessControl({
          access_type: (data as any).access_type,
          can_access_recordings: (data as any).can_access_recordings,
          can_access_transcriptions: (data as any).can_access_transcriptions,
          can_use_ai_tools: (data as any).can_use_ai_tools,
          can_view_analytics: (data as any).can_view_analytics,
          can_manage_documents: (data as any).can_manage_documents,
          time_limited: (data as any).time_limited,
        });
      }
    } catch (error) {
      console.error("Error fetching access control:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("meeting_access_control" as any)
        .upsert({
          meeting_id: meetingId,
          user_id: userId,
          ...accessControl,
        });

      if (error) throw error;

      toast({
        title: "Access updated",
        description: `Updated access permissions for ${userName}`,
      });
    } catch (error) {
      console.error("Error updating access control:", error);
      toast({
        title: "Error",
        description: "Failed to update access permissions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isSeniorRole) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Access Control - {userName}
        </CardTitle>
        <CardDescription>
          Configure granular permissions for this participant
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="access-type">Access Type</Label>
            <Select
              value={accessControl.access_type}
              onValueChange={(value: any) =>
                setAccessControl({ ...accessControl, access_type: value })
              }
            >
              <SelectTrigger id="access-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participant">Participant</SelectItem>
                <SelectItem value="host">Host</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="time-limited">Time-Limited Access</Label>
            </div>
            <Switch
              id="time-limited"
              checked={accessControl.time_limited}
              onCheckedChange={(checked) =>
                setAccessControl({ ...accessControl, time_limited: checked })
              }
            />
          </div>
          {accessControl.time_limited && (
            <p className="text-xs text-muted-foreground ml-6">
              User can only access during meeting time (30 min before to 30 min after)
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="recordings">Access Recordings</Label>
            </div>
            <Switch
              id="recordings"
              checked={accessControl.can_access_recordings}
              onCheckedChange={(checked) =>
                setAccessControl({ ...accessControl, can_access_recordings: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="transcriptions">Access Transcriptions</Label>
            </div>
            <Switch
              id="transcriptions"
              checked={accessControl.can_access_transcriptions}
              onCheckedChange={(checked) =>
                setAccessControl({ ...accessControl, can_access_transcriptions: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="ai-tools">Use AI Tools</Label>
            </div>
            <Switch
              id="ai-tools"
              checked={accessControl.can_use_ai_tools}
              onCheckedChange={(checked) =>
                setAccessControl({ ...accessControl, can_use_ai_tools: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="analytics">View Analytics</Label>
            </div>
            <Switch
              id="analytics"
              checked={accessControl.can_view_analytics}
              onCheckedChange={(checked) =>
                setAccessControl({ ...accessControl, can_view_analytics: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="documents">Manage Documents</Label>
            </div>
            <Switch
              id="documents"
              checked={accessControl.can_manage_documents}
              onCheckedChange={(checked) =>
                setAccessControl({ ...accessControl, can_manage_documents: checked })
              }
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Permissions
        </Button>
      </CardContent>
    </Card>
  );
}
