import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Brain, Sparkles } from "lucide-react";

export const GubaTaskSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: false,
    auto_generate_on_minutes: true,
    auto_assign_enabled: true,
    preferred_language: 'en',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('guba_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          enabled: data.enabled || false,
          auto_generate_on_minutes: data.auto_generate_on_minutes ?? true,
          auto_assign_enabled: data.auto_assign_enabled ?? true,
          preferred_language: data.preferred_language || 'en',
        });
      }
    } catch (error) {
      console.error('Error fetching Guba settings:', error);
      toast({
        title: "Error",
        description: "Failed to load Guba Task settings",
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

      const { error } = await supabase
        .from('guba_settings')
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Guba Task Management settings have been updated",
      });
    } catch (error) {
      console.error('Error saving Guba settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Guba Task Management System
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </CardTitle>
            <CardDescription>
              AI-powered task generation and intelligent assignment
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Guba System */}
        <div className="flex items-center justify-between space-x-4 rounded-lg border p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
          <div className="flex-1 space-y-1">
            <Label htmlFor="guba-enabled" className="text-base font-semibold">
              Enable Guba Task System
            </Label>
            <p className="text-sm text-muted-foreground">
              Activate AI-powered task management with zero-click automation
            </p>
          </div>
          <Switch
            id="guba-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
          />
        </div>

        {settings.enabled && (
          <div className="space-y-4 animate-fade-in">
            {/* Auto-generate on minutes */}
            <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-generate" className="text-base">
                  Auto-Generate from Minutes
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate tasks when meeting minutes are created
                </p>
              </div>
              <Switch
                id="auto-generate"
                checked={settings.auto_generate_on_minutes}
                onCheckedChange={(auto_generate_on_minutes) =>
                  setSettings({ ...settings, auto_generate_on_minutes })
                }
              />
            </div>

            {/* Auto-assign */}
            <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-assign" className="text-base">
                  Smart Auto-Assignment
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI automatically proposes task assignments to relevant departments
                </p>
              </div>
              <Switch
                id="auto-assign"
                checked={settings.auto_assign_enabled}
                onCheckedChange={(auto_assign_enabled) =>
                  setSettings({ ...settings, auto_assign_enabled })
                }
              />
            </div>

            {/* Language preference */}
            <div className="space-y-2">
              <Label htmlFor="language">Task Generation Language</Label>
              <Select
                value={settings.preferred_language}
                onValueChange={(preferred_language) =>
                  setSettings({ ...settings, preferred_language })
                }
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tasks will be generated in your preferred language
              </p>
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
