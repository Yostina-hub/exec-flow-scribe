import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Copy, Flag, ListTodo } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

  if (!transcriptions || transcriptions.length === 0) {
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

  // Reverse to show latest first
  const sortedTranscriptions = [...transcriptions].reverse();
  
  console.log('[LiveTranscriptPanel] Rendering', transcriptions.length, 'transcriptions');
  console.log('[LiveTranscriptPanel] Latest transcription:', transcriptions[transcriptions.length - 1]);

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-3">
        {sortedTranscriptions.map((trans) => (
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

            {/* Content */}
            <p className="text-sm leading-relaxed">{trans.content}</p>

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
      </div>
    </ScrollArea>
  );
};
