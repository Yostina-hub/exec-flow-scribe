import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Share2, MoreHorizontal, Circle, Activity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LiveMeetingStatusBarProps {
  meetingTitle: string;
  isRecording: boolean;
  recordingSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onShare: () => void;
  onGenerateMinutes: () => void;
  networkHealth?: "excellent" | "good" | "poor";
}

export const LiveMeetingStatusBar = ({
  meetingTitle,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  onShare,
  onGenerateMinutes,
  networkHealth = "good",
}: LiveMeetingStatusBarProps) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHealthColor = () => {
    switch (networkHealth) {
      case "excellent": return "bg-success";
      case "good": return "bg-warning";
      case "poor": return "bg-destructive";
      default: return "bg-muted";
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Status and Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            className={`inline-flex h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-destructive animate-pulse' : getHealthColor()}`}
            title={isRecording ? "Recording in progress" : `Network: ${networkHealth}`}
          />
          <h1 className="font-semibold text-lg truncate">{meetingTitle}</h1>
          <Badge 
            variant={isRecording ? "destructive" : "secondary"}
            className="px-2 py-0.5 text-xs"
          >
            {isRecording ? "Recording" : "Ready"}
          </Badge>

          {/* Timer */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-mono tabular-nums font-medium">
                {formatTime(recordingSeconds)}
              </span>
            </div>
          )}

          {/* Waveform Visualization (Placeholder) */}
          {isRecording && (
            <div className="hidden md:flex h-6 w-32 rounded overflow-hidden bg-muted/30 relative items-center justify-center gap-0.5 px-2">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <Button 
              onClick={onStartRecording}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary shadow-lg"
            >
              <Circle className="h-3.5 w-3.5 fill-current" />
              Start Recording
            </Button>
          ) : (
            <Button 
              onClick={onStopRecording}
              variant="destructive"
              className="gap-2 shadow-lg"
            >
              <Activity className="h-3.5 w-3.5" />
              Stop
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onGenerateMinutes}>
                Generate Minutes
              </DropdownMenuItem>
              <DropdownMenuItem>
                Export Transcript
              </DropdownMenuItem>
              <DropdownMenuItem>
                Meeting Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
