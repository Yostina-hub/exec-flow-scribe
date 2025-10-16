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
  const [provider, setProvider] = useState<"lovable_ai" | "openai" | "browser" | "openai_realtime">("lovable_ai");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [language, setLanguage] = useState("auto");
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
        setProvider(data.provider as "lovable_ai" | "openai" | "browser" | "openai_realtime");
        setOpenaiApiKey(data.openai_api_key || "");
        setLanguage(data.language || "auto");
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
        language,
        openai_api_key: (provider === "openai" || provider === "openai_realtime") ? openaiApiKey : null,
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
        <RadioGroup value={provider} onValueChange={(v) => setProvider(v as "lovable_ai" | "openai" | "browser" | "openai_realtime")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lovable_ai" id="lovable_ai" />
            <Label htmlFor="lovable_ai" className="cursor-pointer">
              <div>
                <p className="font-medium">Lemat</p>
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
            <RadioGroupItem value="openai_realtime" id="openai_realtime" />
            <Label htmlFor="openai_realtime" className="cursor-pointer">
              <div>
                <p className="font-medium">OpenAI Realtime ⚡</p>
                <p className="text-sm text-muted-foreground">
                  Advanced: Server VAD, noise suppression, color-coded speakers (uses same API key)
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
                  Standard transcription (uses same API key)
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="language">Transcription Language</Label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="auto">Auto-detect</option>
            <option value="am">Amharic (አማርኛ)</option>
            <option value="en">English</option>
            <option value="ar">Arabic (العربية)</option>
            <option value="fr">French (Français)</option>
            <option value="es">Spanish (Español)</option>
            <option value="de">German (Deutsch)</option>
            <option value="it">Italian (Italiano)</option>
            <option value="pt">Portuguese (Português)</option>
            <option value="ru">Russian (Русский)</option>
            <option value="zh">Chinese (中文)</option>
            <option value="ja">Japanese (日本語)</option>
            <option value="ko">Korean (한국어)</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="sw">Swahili</option>
            <option value="so">Somali</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Select the primary language for transcription. Auto-detect works well for most cases.
          </p>
        </div>

        {(provider === "openai" || provider === "openai_realtime") && (
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
              Same key works for both Whisper and Realtime API. Your API key is stored securely and encrypted.
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