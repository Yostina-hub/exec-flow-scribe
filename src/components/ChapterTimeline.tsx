import { Badge } from "@/components/ui/badge";
import { Circle, Flag, ListChecks, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimelineMarker {
  id: string;
  timestamp: number; // seconds
  type: "speaker" | "decision" | "action" | "topic";
  label: string;
  speaker?: string;
}

interface ChapterTimelineProps {
  markers: TimelineMarker[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const ChapterTimeline = ({
  markers,
  currentTime,
  duration,
  onSeek,
}: ChapterTimelineProps) => {
  const getMarkerIcon = (type: TimelineMarker["type"]) => {
    switch (type) {
      case "speaker": return <Circle className="h-3 w-3" />;
      case "decision": return <Flag className="h-3 w-3" />;
      case "action": return <ListChecks className="h-3 w-3" />;
      case "topic": return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getMarkerColor = (type: TimelineMarker["type"]) => {
    switch (type) {
      case "speaker": return "bg-blue-500";
      case "decision": return "bg-green-500";
      case "action": return "bg-orange-500";
      case "topic": return "bg-purple-500";
      default: return "bg-muted";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (markers.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-md border-t shadow-lg">
      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium text-muted-foreground">Timeline</span>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Speaker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Decision</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Action</span>
            </div>
          </div>
        </div>

        <ScrollArea className="w-full">
          <div className="flex items-center gap-2 pb-2">
            {markers.map((marker) => {
              const position = (marker.timestamp / duration) * 100;
              const isActive = Math.abs(marker.timestamp - currentTime) < 5;
              
              return (
                <button
                  key={marker.id}
                  onClick={() => onSeek(marker.timestamp)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
                    hover:scale-105 hover:shadow-md flex-shrink-0
                    ${isActive 
                      ? 'bg-primary/10 border-primary shadow-sm scale-105' 
                      : 'bg-background border-border hover:bg-muted/50'
                    }
                  `}
                >
                  <div className={`h-2 w-2 rounded-full ${getMarkerColor(marker.type)}`} />
                  <div className="text-left">
                    <div className="text-xs font-mono text-muted-foreground">
                      {formatTime(marker.timestamp)}
                    </div>
                    <div className="text-xs font-medium truncate max-w-[120px]">
                      {marker.label}
                    </div>
                    {marker.speaker && (
                      <div className="text-xs text-muted-foreground truncate">
                        {marker.speaker}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Progress Bar */}
        <div className="relative h-1 bg-muted rounded-full mt-2 overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
