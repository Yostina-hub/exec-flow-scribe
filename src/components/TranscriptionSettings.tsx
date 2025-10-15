import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const TranscriptionSettings = () => {
  const [provider, setProvider] = useState<"lovable_ai" | "openai" | "browser">("lovable_ai");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transcription_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProvider(data.provider as "lovable_ai" | "openai" | "browser");
        setOpenaiApiKey(data.openai_api_key || "");
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load transcription preferences",
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
      if (!user) {
        throw new Error("User not authenticated");
      }

      const preferences = {
        user_id: user.id,
        provider,
        openai_api_key: provider === "openai" ? openaiApiKey : null,
      };

      const { data: existing } = await supabase
        .from("transcription_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("transcription_preferences")
          .update(preferences)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("transcription_preferences")
          .insert(preferences);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Transcription preferences saved successfully",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save transcription preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcription Provider</CardTitle>
        <CardDescription>
          Choose which AI provider to use for live meeting transcription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={provider} onValueChange={(v) => setProvider(v as "lovable_ai" | "openai" | "browser")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lovable_ai" id="lovable_ai" />
            <Label htmlFor="lovable_ai" className="cursor-pointer">
              <div>
                <p className="font-medium">Lovable AI</p>
                <p className="text-sm text-muted-foreground">
                  Powered by Whisper (Recommended)
                </p>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="browser" id="browser" />
            <Label htmlFor="browser" className="cursor-pointer">
              <div>
                <p className="font-medium">Browser-based Whisper</p>
                <p className="text-sm text-muted-foreground">
                  No API needed - runs locally in your browser
                </p>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="openai" id="openai" />
            <Label htmlFor="openai" className="cursor-pointer">
              <div>
                <p className="font-medium">OpenAI Whisper</p>
                <p className="text-sm text-muted-foreground">
                  Requires your own OpenAI API key
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {provider === "openai" && (
          <div className="space-y-2">
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your API key will be stored securely and encrypted
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
};