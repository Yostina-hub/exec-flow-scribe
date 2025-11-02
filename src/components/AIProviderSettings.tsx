import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Sparkles } from "lucide-react";

export const AIProviderSettings = () => {
  const [provider, setProvider] = useState<"lovable_ai" | "openai" | "gemini">("lovable_ai");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
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
        setProvider(data.provider as "lovable_ai" | "openai" | "gemini");
        setOpenaiKey(data.openai_api_key || "");
        setGeminiKey(data.gemini_api_key || "");
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
            openai_api_key: provider === "openai" ? openaiKey : null,
            gemini_api_key: provider === "gemini" ? geminiKey : null,
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
            openai_api_key: provider === "openai" ? openaiKey : null,
            gemini_api_key: provider === "gemini" ? geminiKey : null,
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

      <RadioGroup value={provider} onValueChange={(value) => setProvider(value as "lovable_ai" | "openai" | "gemini")}>
        <div className="space-y-4">
          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="lovable_ai" id="lovable_ai" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="lovable_ai" className="flex items-center gap-2 cursor-pointer">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-semibold">Lemat (Default)</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Powered by Google Gemini 2.5 Flash. Fast, reliable, and no additional API key required.
                Automatically included with your subscription.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="openai" id="openai" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="openai" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="h-5 w-5 text-green-600" />
                <span className="font-semibold">OpenAI GPT-5 (Custom)</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Use your own OpenAI API key for access to GPT-5, the most powerful language model.
                Best for complex meeting analysis and multilingual content.
              </p>
              
              {provider === "openai" && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="openai_key">OpenAI API Key</Label>
                  <Input
                    id="openai_key"
                    type="password"
                    placeholder="Enter your OpenAI API key (sk-...)"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="gemini" id="gemini" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="gemini" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Google Gemini (Custom)</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Use your own Google Gemini API key for more control and access to different Gemini models.
                Great for cost-effective AI processing with fast response times.
              </p>
              
              {provider === "gemini" && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="gemini_key">Google Gemini API Key</Label>
                  <Input
                    id="gemini_key"
                    type="password"
                    placeholder="Enter your Gemini API key"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </RadioGroup>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving || (provider === "openai" && !openaiKey) || (provider === "gemini" && !geminiKey)}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </Card>
  );
};
