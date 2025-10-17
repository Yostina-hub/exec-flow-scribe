import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, BookOpen, FileText, HelpCircle, Play, Download, RefreshCw, Loader2, Clock, List } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState, useRef } from "react";

interface MeetingStudioPanelProps {
  meetingId: string;
}

const MeetingStudioPanel = ({ meetingId }: MeetingStudioPanelProps) => {
  const { toast } = useToast();
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
      toast({ title: "Timeline Generated", description: "Your meeting timeline is ready." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to generate timeline.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, timeline: false }));
    }
  };

  const generateTableOfContents = async () => {
    setLoadingStates(prev => ({ ...prev, toc: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-table-of-contents", {
        body: { meetingId }
      });
      if (error) throw error;
      setToc(data.toc);
      toast({ title: "Table of Contents Generated", description: "Your TOC is ready." });
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to generate table of contents.", variant: "destructive" });
    } finally {
      setLoadingStates(prev => ({ ...prev, toc: false }));
    }
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

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Studio</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Generate AI-powered insights from your meeting
        </p>
      </div>

      <Tabs defaultValue="audio" className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="audio" className="gap-1 text-xs">
              <Volume2 className="h-3 w-3" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="study" className="gap-1 text-xs">
              <BookOpen className="h-3 w-3" />
              Study
            </TabsTrigger>
            <TabsTrigger value="briefing" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Brief
            </TabsTrigger>
            <TabsTrigger value="faq" className="gap-1 text-xs">
              <HelpCircle className="h-3 w-3" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="toc" className="gap-1 text-xs">
              <List className="h-3 w-3" />
              Contents
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Audio Overview Tab */}
          <TabsContent value="audio" className="p-4 space-y-4">
            {!audioUrl ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <Volume2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Audio Overview</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                  Generate an AI-narrated podcast-style summary with key insights
                </p>
                <Button onClick={generateAudioOverview} disabled={isGenerating}>
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" />Generate Audio</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Meeting Overview</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={audioUrl} download="meeting-overview.mp3">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateAudioOverview} disabled={isGenerating}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <audio ref={audioRef} controls className="w-full" src={audioUrl} onEnded={() => setIsPlaying(false)}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </TabsContent>

          {/* Study Guide Tab */}
          <TabsContent value="study" className="p-4 space-y-4">
            {!studyGuide ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Study Guide</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                  Create a comprehensive study guide with key concepts, terms, and questions
                </p>
                <Button onClick={generateStudyGuide} disabled={loadingStates.studyGuide}>
                  {loadingStates.studyGuide ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <>Generate Study Guide</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Study Guide</h3>
                  <Button variant="outline" size="sm" onClick={generateStudyGuide} disabled={loadingStates.studyGuide}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {studyGuide.key_concepts && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Badge variant="secondary">Key Concepts</Badge>
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {studyGuide.key_concepts.map((concept: string, i: number) => (
                          <li key={i}>{concept}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {studyGuide.terms && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Badge variant="secondary">Important Terms</Badge>
                      </h4>
                      <div className="space-y-2">
                        {studyGuide.terms.map((term: any, i: number) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{term.term}:</span> {term.definition}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {studyGuide.discussion_questions && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Badge variant="secondary">Discussion Questions</Badge>
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        {studyGuide.discussion_questions.map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Briefing Tab */}
          <TabsContent value="briefing" className="p-4 space-y-4">
            {!briefing ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Briefing Document</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                  Generate an executive briefing with summary, highlights, and action items
                </p>
                <Button onClick={generateBriefing} disabled={loadingStates.briefing}>
                  {loadingStates.briefing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <>Generate Briefing</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Executive Briefing</h3>
                  <Button variant="outline" size="sm" onClick={generateBriefing} disabled={loadingStates.briefing}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {briefing.executive_summary && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Executive Summary</h4>
                      <p className="text-sm">{briefing.executive_summary}</p>
                    </div>
                  )}
                  {briefing.highlights && (
                    <div>
                      <h4 className="font-medium mb-2">Key Highlights</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {briefing.highlights.map((h: string, i: number) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {briefing.action_items && (
                    <div>
                      <h4 className="font-medium mb-2">Action Items</h4>
                      <ul className="space-y-2">
                        {briefing.action_items.map((item: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Badge className="mt-0.5">→</Badge>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="p-4 space-y-4">
            {!faq ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Frequently Asked Questions</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                  Generate a comprehensive FAQ covering key topics and decisions
                </p>
                <Button onClick={generateFAQ} disabled={loadingStates.faq}>
                  {loadingStates.faq ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <>Generate FAQ</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">FAQ</h3>
                  <Button variant="outline" size="sm" onClick={generateFAQ} disabled={loadingStates.faq}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  {faq.faqs?.map((item: any, i: number) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left text-sm">
                        <div>
                          <Badge variant="outline" className="mr-2 text-xs">
                            {item.category}
                          </Badge>
                          {item.question}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="p-4 space-y-4">
            {!timeline ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Meeting Timeline</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                  Create a chronological timeline of meeting events and discussions
                </p>
                <Button onClick={generateTimeline} disabled={loadingStates.timeline}>
                  {loadingStates.timeline ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <>Generate Timeline</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Timeline</h3>
                  <Button variant="outline" size="sm" onClick={generateTimeline} disabled={loadingStates.timeline}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="relative space-y-6 pl-6">
                  {timeline.events?.map((event: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-6 mt-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                      {i < timeline.events.length - 1 && (
                        <div className="absolute -left-5 top-6 bottom-0 w-0.5 bg-border" />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={event.type === 'decision' ? 'default' : 'secondary'}>
                            {event.time}
                          </Badge>
                          <span className="font-medium text-sm">{event.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Table of Contents Tab */}
          <TabsContent value="toc" className="p-4 space-y-4">
            {!toc ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <List className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Table of Contents</h3>
                <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                  Generate a structured outline of meeting topics and discussions
                </p>
                <Button onClick={generateTableOfContents} disabled={loadingStates.toc}>
                  {loadingStates.toc ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <>Generate Contents</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Table of Contents</h3>
                  <Button variant="outline" size="sm" onClick={generateTableOfContents} disabled={loadingStates.toc}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {toc.sections?.map((section: any, i: number) => (
                    <div
                      key={i}
                      className={`text-sm ${
                        section.level === 1 ? 'font-medium' : 
                        section.level === 2 ? 'ml-4 text-muted-foreground' : 
                        'ml-8 text-muted-foreground text-xs'
                      }`}
                    >
                      <span className="text-primary mr-2">{section.page_number}</span>
                      {section.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </Card>
  );
};

export default MeetingStudioPanel;
