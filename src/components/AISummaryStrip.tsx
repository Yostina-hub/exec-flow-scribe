import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface AISummaryStripProps {
  meetingId: string;
  isRecording: boolean;
}

interface Chapter {
  id: string;
  title: string;
  timestamp: string;
  type: "intro" | "discussion" | "decision" | "action";
}

export const AISummaryStrip = ({ meetingId, isRecording }: AISummaryStripProps) => {
  if (!meetingId) return null;
  
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: "1", title: "Introductions", timestamp: "00:00", type: "intro" },
  ]);

  // Mock: Add new chapters as meeting progresses
  useEffect(() => {
    if (!isRecording) return;

    const timer = setTimeout(() => {
      setChapters(prev => [
        ...prev,
        { 
          id: String(prev.length + 1), 
          title: "Budget Discussion", 
          timestamp: "05:30", 
          type: "discussion" 
        }
      ]);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isRecording, chapters.length]);

  const getChapterColor = (type: Chapter["type"]) => {
    switch (type) {
      case "intro": return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "discussion": return "bg-purple-500/10 text-purple-700 border-purple-200";
      case "decision": return "bg-green-500/10 text-green-700 border-green-200";
      case "action": return "bg-orange-500/10 text-orange-700 border-orange-200";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (chapters.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 border-b px-4 py-3">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
            Live Summary:
          </span>
          
          <div className="flex items-center gap-2">
            {chapters.map((chapter, idx) => (
              <div key={chapter.id} className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${getChapterColor(chapter.type)} flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:scale-105 transition-transform`}
                >
                  <span className="text-xs font-mono">{chapter.timestamp}</span>
                  <span className="text-xs font-medium">{chapter.title}</span>
                </Badge>
                {idx < chapters.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>

          {isRecording && (
            <Badge variant="secondary" className="ml-2 animate-pulse flex-shrink-0">
              AI Listening...
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
