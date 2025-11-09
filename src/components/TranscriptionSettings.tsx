import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export const TranscriptionSettings = () => {
  const [provider, setProvider] = useState<"lovable_ai" | "openai" | "browser" | "openai_realtime">("lovable_ai");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [whisperApiKey, setWhisperApiKey] = useState("");
  const [realtimeApiKey, setRealtimeApiKey] = useState("");
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("");
  const [useSameKey, setUseSameKey] = useState(true);
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
        setWhisperApiKey(data.whisper_api_key || "");
        setRealtimeApiKey(data.realtime_api_key || "");
        setElevenlabsApiKey(data.elevenlabs_api_key || "");
        setUseSameKey(data.use_same_key !== false); // default to true
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
        whisper_api_key: (provider === "openai" || provider === "openai_realtime") 
          ? (useSameKey ? openaiApiKey : whisperApiKey) 
          : null,
        realtime_api_key: (provider === "openai" || provider === "openai_realtime") 
          ? (useSameKey ? openaiApiKey : realtimeApiKey) 
          : null,
        elevenlabs_api_key: elevenlabsApiKey || null,
        use_same_key: useSameKey,
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
                  Advanced: Server VAD, noise suppression, color-coded speakers. Requires OpenAI API key (configured below).
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
                  Standard transcription. Requires OpenAI API key (configured below).
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
              <option value="auto">Auto-detect (Recommended - includes speaker identification)</option>
              <option value="am">Amharic (አማርኛ)</option>
              <option value="ti">Tigrinya (ትግርኛ)</option>
              <option value="en">English</option>
              <option value="or">Afaan Oromo</option>
              <option value="so">Af-Soomaali (Somali)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Auto-detect automatically identifies the language and speakers. All transcriptions are stored with speaker identification and timestamps.
            </p>
          </div>

        {(provider === "openai" || provider === "openai_realtime") && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="use-same-key"
                checked={useSameKey}
                onChange={(e) => setUseSameKey(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="use-same-key" className="cursor-pointer">
                Use same API key for both Whisper and Realtime
              </Label>
            </div>

            {useSameKey ? (
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key (Both Services)</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This key will be used for both Whisper transcription and OpenAI Realtime API.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whisper-key">Whisper API Key</Label>
                  <Input
                    id="whisper-key"
                    type="password"
                    placeholder="sk-..."
                    value={whisperApiKey}
                    onChange={(e) => setWhisperApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For browser-based and standard OpenAI Whisper transcription
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="realtime-key">OpenAI Realtime API Key</Label>
                  <Input
                    id="realtime-key"
                    type="password"
                    placeholder="sk-..."
                    value={realtimeApiKey}
                    onChange={(e) => setRealtimeApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For OpenAI Realtime API with server VAD and speaker detection
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Your API keys are stored securely and encrypted in the database.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="elevenlabs-key">ElevenLabs API Key (Optional)</Label>
          <Input
            id="elevenlabs-key"
            type="password"
            placeholder="Enter your ElevenLabs API key..."
            value={elevenlabsApiKey}
            onChange={(e) => setElevenlabsApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used for text-to-speech and audio generation features. Get your key from elevenlabs.io
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
};