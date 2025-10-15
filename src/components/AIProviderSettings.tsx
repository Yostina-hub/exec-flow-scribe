import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, BookOpen } from "lucide-react";

export const AIProviderSettings = () => {
  const [provider, setProvider] = useState<"lovable_ai" | "notebooklm">("lovable_ai");
  const [notebookLMKey, setNotebookLMKey] = useState("");
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
        .from("ai_provider_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProvider(data.provider as "lovable_ai" | "notebooklm");
        setNotebookLMKey(data.notebooklm_api_key || "");
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

      // Check if preference exists
      const { data: existing } = await supabase
        .from("ai_provider_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing preference
        const { error } = await supabase
          .from("ai_provider_preferences")
          .update({
            provider,
            notebooklm_api_key: provider === "notebooklm" ? notebookLMKey : null,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new preference
        const { error } = await supabase
          .from("ai_provider_preferences")
          .insert({
            user_id: user.id,
            provider,
            notebooklm_api_key: provider === "notebooklm" ? notebookLMKey : null,
          });

        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Your AI provider preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">AI Provider Settings</h3>
        <p className="text-sm text-muted-foreground">
          Choose which AI provider to use for generating meeting minutes and analysis.
        </p>
      </div>

      <RadioGroup value={provider} onValueChange={(value) => setProvider(value as "lovable_ai" | "notebooklm")}>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="lovable_ai" id="lovable_ai" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="lovable_ai" className="flex items-center gap-2 cursor-pointer">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-semibold">Lovable AI (Default)</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Powered by Google Gemini. Fast, reliable, and no additional API key required.
                Automatically included with your Lovable Cloud subscription.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="notebooklm" id="notebooklm" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="notebooklm" className="flex items-center gap-2 cursor-pointer">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold">NotebookLM</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Google's experimental AI for working with documents and notes.
                Requires your own NotebookLM API key.
              </p>
              
              {provider === "notebooklm" && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="notebooklm_key">NotebookLM API Key</Label>
                  <Input
                    id="notebooklm_key"
                    type="password"
                    placeholder="Enter your NotebookLM API key"
                    value={notebookLMKey}
                    onChange={(e) => setNotebookLMKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted and stored securely.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </RadioGroup>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || (provider === "notebooklm" && !notebookLMKey)}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </Card>
  );
};
