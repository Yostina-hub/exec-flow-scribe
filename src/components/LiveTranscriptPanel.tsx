import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Copy, Flag, ListTodo, Clock, Languages, Circle, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TranscriptLine {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
  tags: ("task" | "decision" | "risk")[];
}

interface LiveTranscriptPanelProps {
  transcriptions: any[];
  onAddAction?: (content: string) => void;
  onAddDecision?: (content: string) => void;
}

export const LiveTranscriptPanel = ({
  transcriptions,
  onAddAction,
  onAddDecision,
}: LiveTranscriptPanelProps) => {
  const { toast } = useToast();
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(0);
  
  // Get latest transcription
  const latestTranscription = transcriptions[transcriptions.length - 1];
  const previousTranscriptions = transcriptions.slice(0, -1);
  
  // Typing animation for latest transcription
  useEffect(() => {
    if (!latestTranscription) {
      setDisplayedText("");
      return;
    }
    
    // Check if this is a new transcription
    const isNewTranscription = transcriptions.length > previousCountRef.current;
    previousCountRef.current = transcriptions.length;
    
    if (isNewTranscription) {
      // Start typing animation for new transcription
      setIsTyping(true);
      setDisplayedText("");
      
      const fullText = latestTranscription.content;
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setDisplayedText(fullText.slice(0, currentIndex));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typingInterval);
        }
      }, 30); // Typing speed: 30ms per character
      
      return () => clearInterval(typingInterval);
    } else {
      // Not a new transcription, show full text immediately
      setDisplayedText(latestTranscription.content);
      setIsTyping(false);
    }
  }, [latestTranscription?.id]);
  
  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText, transcriptions.length]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const getSpeakerColor = (speaker: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-green-100 text-green-700 border-green-200",
      "bg-orange-100 text-orange-700 border-orange-200",
      "bg-pink-100 text-pink-700 border-pink-200",
    ];
    const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (transcriptions.length === 0 && !isTyping) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <ListTodo className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No transcriptions yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Start recording to see live transcriptions appear here. Speaker identification and AI tags will be automatically added.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <ScrollArea className="h-[500px]" ref={scrollRef}>
        <div className="p-4 space-y-3">
          {/* Previous transcriptions (completed) */}
          {previousTranscriptions.reverse().map((trans) => (
          <Card
            key={trans.id}
            className="group relative p-4 hover:shadow-md transition-all duration-200 animate-fade-in"
            onMouseEnter={() => setHoveredId(trans.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Speaker and Timestamp */}
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className={getSpeakerColor(trans.speaker_name || "Unknown")}>
                {trans.speaker_name || "Unknown Speaker"}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {trans.timestamp || "00:00"}
              </span>
            </div>

            <p className="text-sm leading-relaxed" 
               style={{ 
                 fontFamily: trans.detected_language === 'am' 
                   ? "'Noto Sans Ethiopic', 'Nyala', sans-serif" 
                   : 'inherit',
                 direction: 'ltr',
                 unicodeBidi: 'embed'
               }}
            >
              {trans.content}
            </p>

            {/* Tags */}
            {trans.detected_language && (
              <Badge variant="secondary" className="mt-2 text-xs">
                {trans.detected_language}
              </Badge>
            )}

            {/* Quick Actions (shown on hover) */}
            <div 
              className={`
                mt-3 flex items-center gap-2 transition-all duration-200
                ${hoveredId === trans.id ? 'opacity-100' : 'opacity-0'}
              `}
            >
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => onAddAction?.(trans.content)}
              >
                <ListTodo className="h-3 w-3" />
                Add Task
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => onAddDecision?.(trans.content)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Add Decision
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5"
                onClick={() => handleCopy(trans.content)}
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>
          </Card>
          ))}
          
          {/* Latest transcription with live typing effect */}
          {latestTranscription && (
            <Card
              key={`live-${latestTranscription.id}`}
              className="group relative p-4 bg-primary/5 border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={getSpeakerColor(latestTranscription.speaker_name || 'Unknown')}
                  >
                    {latestTranscription.speaker_name || 'Unknown Speaker'}
                  </Badge>
                  
                  {latestTranscription.detected_language && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Languages className="h-3 w-3" />
                      {latestTranscription.detected_language}
                    </Badge>
                  )}
                  
                  {isTyping && (
                    <Badge variant="outline" className="gap-1.5 animate-pulse border-primary/40 bg-primary/5">
                      <Circle className="h-2 w-2 fill-primary text-primary animate-pulse" />
                      <span className="text-xs">Live</span>
                    </Badge>
                  )}
                </div>
                
                <span className="text-xs text-muted-foreground font-mono">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {latestTranscription.timestamp 
                    ? format(new Date(latestTranscription.timestamp), 'HH:mm:ss')
                    : '00:00:00'
                  }
                </span>
              </div>

              <p 
                className="text-base leading-relaxed whitespace-pre-wrap" 
                style={{ 
                  fontFamily: latestTranscription.detected_language === 'am' 
                    ? "'Noto Sans Ethiopic', 'Nyala', sans-serif" 
                    : 'inherit',
                  direction: 'ltr',
                  unicodeBidi: 'embed'
                }}
              >
                {displayedText}
                {isTyping && <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse" />}
              </p>

              {/* Quick Actions (shown on hover) */}
              <div 
                className={`
                  mt-3 flex items-center gap-2 transition-all duration-200
                  ${hoveredId === latestTranscription.id ? 'opacity-100' : 'opacity-0'}
                `}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => onAddAction?.(displayedText)}
                >
                  <Plus className="h-3 w-3" />
                  Add Task
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => onAddDecision?.(displayedText)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Add Decision
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleCopy(displayedText)}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
