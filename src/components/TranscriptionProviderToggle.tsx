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
  const [provider, setProvider] = useState<"lemat" | "openai">("lemat");
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
        // Map old providers to new ones
        const mappedProvider = ["lovable_ai", "browser"].includes(data.provider) ? "lemat" : "openai";
        setProvider(mappedProvider as "lemat" | "openai");
      }
    } catch (error) {
      console.error("Error fetching provider:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = async (newProvider: string) => {
    const typedProvider = newProvider as "lemat" | "openai";
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

      // Map to actual backend provider
      const backendProvider = typedProvider === "lemat" ? "browser" : "openai_realtime";
      
      if (existing) {
        await supabase
          .from("transcription_preferences")
          .update({ provider: backendProvider })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("transcription_preferences")
          .insert({ user_id: user.id, provider: backendProvider });
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
      case "lemat": return "Lemat";
      case "openai": return "OpenAI";
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
            <RadioGroupItem value="lemat" id="toggle-lemat" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="toggle-lemat" className="cursor-pointer flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium">Lemat</span>
                <Badge variant="default" className="text-xs">Default</Badge>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Fast and reliable transcription
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="openai" id="toggle-openai" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="toggle-openai" className="cursor-pointer flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-medium">OpenAI</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Advanced AI transcription with real-time processing
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
