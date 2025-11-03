import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Mic, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TranscriptionProviderToggleProps {
  onProviderChange?: (provider: string) => void;
}

export const TranscriptionProviderToggle = ({ onProviderChange }: TranscriptionProviderToggleProps) => {
  const [provider, setProvider] = useState<"lovable_ai" | "openai" | "browser" | "openai_realtime">("lovable_ai");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentProvider();
  }, []);

  const fetchCurrentProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("transcription_preferences")
        .select("provider")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProvider(data.provider as "lovable_ai" | "openai" | "browser" | "openai_realtime");
      }
    } catch (error) {
      console.error("Error fetching provider:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = async (newProvider: string) => {
    const typedProvider = newProvider as "lovable_ai" | "openai" | "browser" | "openai_realtime";
    setProvider(typedProvider);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update preferences in database
      const { data: existing } = await supabase
        .from("transcription_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("transcription_preferences")
          .update({ provider: typedProvider })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("transcription_preferences")
          .insert({ user_id: user.id, provider: typedProvider });
      }

      toast({
        title: "Provider Updated",
        description: `Switched to ${getProviderDisplayName(typedProvider)}`,
      });

      // Notify parent component
      onProviderChange?.(typedProvider);
    } catch (error) {
      console.error("Error updating provider:", error);
      toast({
        title: "Error",
        description: "Failed to update transcription provider",
        variant: "destructive",
      });
    }
  };

  const getProviderDisplayName = (p: string) => {
    switch (p) {
      case "lovable_ai": return "Lemat AI";
      case "browser": return "Lemat";
      case "openai_realtime": return "OpenAI Realtime";
      case "openai": return "OpenAI Whisper";
      default: return "Unknown";
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Transcription Provider
        </CardTitle>
        <CardDescription className="text-xs">
          Choose your AI transcription engine
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={provider} onValueChange={handleProviderChange} className="space-y-3">
          <div className="flex items-start space-x-3 rounded-lg border border-primary/20 p-3 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="lovable_ai" id="toggle-lovable_ai" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="toggle-lovable_ai" className="cursor-pointer flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium">Lemat AI</span>
                <Badge variant="default" className="text-xs">Default</Badge>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Fast, accurate AI-powered transcription
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="browser" id="toggle-browser" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="toggle-browser" className="cursor-pointer flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="font-medium">Lemat</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Browser-based, no API key needed
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="openai_realtime" id="toggle-realtime" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="toggle-realtime" className="cursor-pointer flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="font-medium">OpenAI Realtime</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time streaming transcription
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="openai" id="toggle-openai" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="toggle-openai" className="cursor-pointer flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-medium">OpenAI Whisper</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                High-accuracy batch transcription
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
