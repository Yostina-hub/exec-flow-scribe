import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Volume2, Brain, FileText, BookOpen, HelpCircle, Play, Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MeetingStudioPanelProps {
  meetingId: string;
}

const MeetingStudioPanel = ({ meetingId }: MeetingStudioPanelProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("audio");
  const [loading, setLoading] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateAudioOverview = async () => {
    setLoading("audio");
    try {
      const { data, error } = await supabase.functions.invoke("generate-audio-overview", {
        body: { meetingId, voice: "9BWtsMINqrJLrRacOk9x" } // Aria voice
      });

      if (error) throw error;

      if (data.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        toast({
          title: "Audio Overview Generated",
          description: "Your meeting summary is ready to play.",
        });
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      toast({
        title: "Error",
        description: "Failed to generate audio overview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const studioFeatures = [
    {
      id: "audio",
      label: "Audio Overview",
      icon: Volume2,
      description: "AI-generated audio summary",
      comingSoon: false,
    },
    {
      id: "mindmap",
      label: "Mind Map",
      icon: Brain,
      description: "Visual decision tree",
      comingSoon: true,
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      description: "Detailed analysis",
      comingSoon: true,
    },
    {
      id: "flashcards",
      label: "Flashcards",
      icon: BookOpen,
      description: "Key highlights",
      comingSoon: true,
    },
    {
      id: "quiz",
      label: "Quiz",
      icon: HelpCircle,
      description: "Test comprehension",
      comingSoon: true,
    },
  ];

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Studio</h2>
          <p className="text-muted-foreground">
            Generate insights and content from your meeting
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            {studioFeatures.map((feature) => (
              <TabsTrigger
                key={feature.id}
                value={feature.id}
                disabled={feature.comingSoon}
                className="relative"
              >
                <feature.icon className="h-4 w-4 mr-2" />
                {feature.label}
                {feature.comingSoon && (
                  <span className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground px-1 rounded">
                    Soon
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="audio" className="space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              {!audioUrl ? (
                <>
                  <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Audio Overview</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Generate an AI-narrated summary of your meeting with key decisions and action items
                  </p>
                  <Button
                    onClick={generateAudioOverview}
                    disabled={loading === "audio"}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {loading === "audio" ? "Generating..." : "Generate Audio Overview"}
                  </Button>
                </>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Your Audio Overview</h3>
                    <Button variant="outline" size="sm" asChild>
                      <a href={audioUrl} download="meeting-overview.mp3">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                  <audio controls className="w-full" src={audioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAudioUrl(null);
                      generateAudioOverview();
                    }}
                    disabled={loading === "audio"}
                  >
                    Regenerate
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {studioFeatures.slice(1).map((feature) => (
            <TabsContent key={feature.id} value={feature.id} className="space-y-4 mt-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <feature.icon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{feature.label}</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {feature.description}
                </p>
                <p className="text-sm font-medium text-primary">Coming Soon</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Card>
  );
};

export default MeetingStudioPanel;