import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function JitsiSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState({
    api_token: "",
    domain: "meet.jit.si",
    is_active: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("jitsi_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettingsId(data.id);
        setSettings({
          api_token: data.api_token,
          domain: data.domain,
          is_active: data.is_active,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load TMeet settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error } = await supabase
          .from("jitsi_settings")
          .update(payload)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("jitsi_settings")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      toast({
        title: "Success",
        description: "TMeet settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("jitsi-recording-control", {
        body: {
          action: "test",
          domain: settings.domain,
          apiToken: settings.api_token,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "TMeet API connection test successful",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to TMeet API",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>TMeet (Jitsi) Configuration</CardTitle>
        <CardDescription>
          Configure your self-hosted TMeet server for conference recording and transcription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="domain">TMeet Domain</Label>
          <Input
            id="domain"
            placeholder="meet.example.com"
            value={settings.domain}
            onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Your self-hosted TMeet server domain (without https://)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="api_token">API Token</Label>
          <Input
            id="api_token"
            type="password"
            placeholder="Enter your TMeet API token"
            value={settings.api_token}
            onChange={(e) => setSettings({ ...settings, api_token: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            API token for authenticating with your TMeet recording service (Jibri)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={settings.is_active}
            onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
          />
          <Label htmlFor="is_active">Enable TMeet Recording</Label>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !settings.api_token || !settings.domain}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>

          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !settings.api_token || !settings.domain}
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="text-sm font-medium">How to get your API token:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Access your TMeet server configuration</li>
            <li>Locate the Jibri (recording service) configuration</li>
            <li>Find or generate an API authentication token</li>
            <li>Copy the token and paste it above</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}