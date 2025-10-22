import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Radio, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AudioOverviewPlayerProps {
  sourceIds: string[];
  notebookId: string;
}

export const AudioOverviewPlayer = ({ sourceIds, notebookId }: AudioOverviewPlayerProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const generateAudioOverview = async () => {
    if (sourceIds.length === 0) {
      toast({
        title: "No sources selected",
        description: "Please select at least one source to generate an audio overview",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-audio-overview', {
        body: { sourceIds, notebookId }
      });

      if (error) throw error;

      setAudioUrl(data.audioUrl);
      toast({
        title: "Audio Overview Generated!",
        description: `Created podcast with ${data.segmentCount} segments`,
      });
    } catch (error) {
      console.error('Error generating audio overview:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate audio overview",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Audio Overview</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Generate a podcast-style conversation about your sources, just like Google NotebookLM
      </p>

      {!audioUrl ? (
        <Button 
          onClick={generateAudioOverview} 
          disabled={isGenerating || sourceIds.length === 0}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Audio Overview...
            </>
          ) : (
            <>
              <Radio className="mr-2 h-4 w-4" />
              Generate Audio Overview
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button 
            onClick={togglePlayback}
            className="w-full"
            variant="secondary"
          >
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Play Audio Overview
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => {
              setAudioUrl(null);
              setAudioElement(null);
              setIsPlaying(false);
            }}
            variant="outline"
            className="w-full"
          >
            Generate New Overview
          </Button>
        </div>
      )}
    </Card>
  );
};
