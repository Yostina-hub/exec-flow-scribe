import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Minimize2, Maximize2, Move, Clock, Circle } from "lucide-react";
import { LiveTranscriptPanel } from "./LiveTranscriptPanel";

interface LiveTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingTitle: string;
  transcriptions: any[];
  recordingSeconds: number;
  onAddAction?: (content: string) => void;
  onAddDecision?: (content: string) => void;
}

export const LiveTranscriptionModal = ({
  isOpen,
  onClose,
  meetingTitle,
  transcriptions,
  recordingSeconds,
  onAddAction,
  onAddDecision,
}: LiveTranscriptionModalProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 520 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <Card
        className="fixed z-50 shadow-2xl cursor-move border-2 border-primary bg-background"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '320px',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between p-3 bg-primary/5">
          <div className="flex items-center gap-2">
            <Circle className="h-3 w-3 fill-destructive text-destructive animate-pulse" />
            <span className="font-semibold text-sm truncate max-w-[150px]">{meetingTitle}</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {formatTime(recordingSeconds)}
            </Badge>
          </div>
          <div className="flex items-center gap-1 no-drag">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="p-3 bg-muted/30 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Live transcription in progress...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="fixed z-50 shadow-2xl border-2 border-primary"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '320px' : '800px',
        height: isMinimized ? 'auto' : '500px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-3">
          <Move className="h-4 w-4 text-muted-foreground" />
          <Circle className="h-3 w-3 fill-destructive text-destructive animate-pulse" />
          <div>
            <h3 className="font-semibold text-base">{meetingTitle}</h3>
            <p className="text-xs text-muted-foreground">Live Transcription</p>
          </div>
          <Badge variant="secondary" className="px-2 py-0.5">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(recordingSeconds)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100%-76px)] overflow-hidden">
        <LiveTranscriptPanel
          transcriptions={transcriptions}
          onAddAction={onAddAction}
          onAddDecision={onAddDecision}
        />
      </div>
    </Card>
  );
};