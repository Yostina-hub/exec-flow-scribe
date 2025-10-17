import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Headphones,
  FileText,
  ArrowLeft,
  Loader2,
  BookOpen,
  MessageSquare,
  Clock,
  List,
  Video,
  GitBranch,
  BarChart3,
  Layers,
  Target,
  Play,
  Download,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MeetingStudioPanelProps {
  meetingId: string;
}

const MeetingStudioPanel = ({ meetingId }: MeetingStudioPanelProps) => {
  const { toast } = useToast();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // State for all studio outputs
  const [studyGuide, setStudyGuide] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [faq, setFaq] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [toc, setToc] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState({
    studyGuide: false,
    briefing: false,
    faq: false,
    timeline: false,
    toc: false,
  });

  const studioFeatures = [
    {
      id: "audio",
      title: "Audio Overview",
      description: "AI-narrated podcast summary",
      icon: Headphones,
      available: true,
    },
    {
      id: "video",
      title: "Video Overview",
      description: "Visual summary with narration",
      icon: Video,
      available: false,
    },
    {
      id: "study",
      title: "Study Guide",
      description: "Key concepts and terms",
      icon: BookOpen,
      available: true,
    },
    {
      id: "briefing",
      title: "Briefing Document",
      description: "Executive summary",
      icon: FileText,
      available: true,
    },
    {
      id: "faq",
      title: "FAQ",
      description: "Questions and answers",
      icon: MessageSquare,
      available: true,
    },
    {
      id: "timeline",
      title: "Timeline",
      description: "Chronological overview",
      icon: Clock,
      available: true,
    },
    {
      id: "toc",
      title: "Table of Contents",
      description: "Document structure",
      icon: List,
      available: true,
    },
    {
      id: "mindmap",
      title: "Mind Map",
      description: "Visual concept mapping",
      icon: GitBranch,
      available: false,
    },
    {
      id: "reports",
      title: "Reports",
      description: "Detailed analysis",
      icon: BarChart3,
      available: false,
    },
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Study cards",
      icon: Layers,
      available: false,
    },
    {
      id: "quiz",
      title: "Quiz",
      description: "Test your knowledge",
      icon: Target,
      available: false,
    },
  ];

  const generateAudioOverview = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-audio-overview", {
        body: { meetingId, voice: "9BWtsMINqrJLrRacOk9x" }
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
      setIsGenerating(false);
    }
  };

  const generateStudyGuide = async () => {
    setLoadingStates(prev => ({ ...prev, studyGuide: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-guide", {
        body: { meetingId }
      });
      if (error) throw error;
      setStudyGuide(data.studyGuide);
      toast({ title: "Study Guide Generated", description: "Your study guide is ready." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to generate study guide.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, studyGuide: false }));
    }
  };

  const generateBriefing = async () => {
    setLoadingStates(prev => ({ ...prev, briefing: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-briefing", {
        body: { meetingId }
      });
      if (error) throw error;
      setBriefing(data.briefing);
      toast({ title: "Briefing Generated", description: "Your briefing document is ready." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to generate briefing.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, briefing: false }));
    }
  };

  const generateFAQ = async () => {
    setLoadingStates(prev => ({ ...prev, faq: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-faq", {
        body: { meetingId }
      });
      if (error) throw error;
      setFaq(data.faq);
      toast({ title: "FAQ Generated", description: "Your FAQ is ready." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to generate FAQ.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, faq: false }));
    }
  };

  const generateTimeline = async () => {
    setLoadingStates(prev => ({ ...prev, timeline: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-timeline", {
        body: { meetingId }
      });
      if (error) throw error;
      setTimeline(data.timeline);
      toast({ title: "Timeline Generated", description: "Your timeline is ready." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to generate timeline.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, timeline: false }));
    }
  };

  const generateTOC = async () => {
    setLoadingStates(prev => ({ ...prev, toc: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-table-of-contents", {
        body: { meetingId }
      });
      if (error) throw error;
      setToc(data.toc);
      toast({ title: "Table of Contents Generated", description: "Your table of contents is ready." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to generate table of contents.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, toc: false }));
    }
  };

  const handleFeatureClick = (featureId: string, available: boolean) => {
    if (!available) {
      toast({
        title: "Coming Soon",
        description: "This feature will be available in a future update.",
      });
      return;
    }
    setSelectedFeature(featureId);
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `meeting-overview-${meetingId}.mp3`;
      a.click();
    }
  };

  if (selectedFeature) {
    return (
      <div className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedFeature(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Studio
        </Button>

        {/* Audio Overview Detail */}
        {selectedFeature === "audio" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Audio Overview</h3>
            {!audioUrl ? (
              <Button
                onClick={generateAudioOverview}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Audio Overview"
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={isPlaying ? pauseAudio : playAudio}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button onClick={downloadAudio} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Study Guide Detail */}
        {selectedFeature === "study" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Study Guide</h3>
            {!studyGuide ? (
              <Button
                onClick={generateStudyGuide}
                disabled={loadingStates.studyGuide}
                className="w-full"
              >
                {loadingStates.studyGuide ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Study Guide"
                )}
              </Button>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {studyGuide.sections?.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="font-semibold text-base">{section.title}</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {section.items?.map((item: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground">{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Briefing Detail */}
        {selectedFeature === "briefing" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Briefing Document</h3>
            {!briefing ? (
              <Button
                onClick={generateBriefing}
                disabled={loadingStates.briefing}
                className="w-full"
              >
                {loadingStates.briefing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Briefing"
                )}
              </Button>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{briefing.summary}</p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Key Points</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {briefing.key_points?.map((point: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">{point}</li>
                      ))}
                    </ul>
                  </div>
                  {briefing.recommendations && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {briefing.recommendations?.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* FAQ Detail */}
        {selectedFeature === "faq" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">FAQ</h3>
            {!faq ? (
              <Button
                onClick={generateFAQ}
                disabled={loadingStates.faq}
                className="w-full"
              >
                {loadingStates.faq ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate FAQ"
                )}
              </Button>
            ) : (
              <ScrollArea className="h-[600px]">
                <Accordion type="single" collapsible className="w-full">
                  {faq.questions?.map((item: any, idx: number) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Timeline Detail */}
        {selectedFeature === "timeline" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Timeline</h3>
            {!timeline ? (
              <Button
                onClick={generateTimeline}
                disabled={loadingStates.timeline}
                className="w-full"
              >
                {loadingStates.timeline ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Timeline"
                )}
              </Button>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {timeline.events?.map((event: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {idx < timeline.events.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <Badge variant="secondary" className="mb-2">
                          {event.time || event.timestamp}
                        </Badge>
                        <h4 className="font-semibold mb-1">{event.title || event.event}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.description || event.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Table of Contents Detail */}
        {selectedFeature === "toc" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Table of Contents</h3>
            {!toc ? (
              <Button
                onClick={generateTOC}
                disabled={loadingStates.toc}
                className="w-full"
              >
                {loadingStates.toc ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Table of Contents"
                )}
              </Button>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {toc.sections?.map((section: any, idx: number) => (
                    <div key={idx} style={{ marginLeft: `${(section.level - 1) * 20}px` }}>
                      <div className="flex items-center gap-2 py-2">
                        <span className="text-xs text-muted-foreground">{section.page || idx + 1}</span>
                        <span className="text-sm">{section.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {studioFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                !feature.available ? "opacity-60" : ""
              }`}
              onClick={() => handleFeatureClick(feature.id, feature.available)}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className="relative">
                  <Icon className="h-8 w-8 text-primary" />
                  {!feature.available && (
                    <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MeetingStudioPanel;
