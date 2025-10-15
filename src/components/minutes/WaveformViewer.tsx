import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface WaveformViewerProps {
  meetingId: string;
  onSeek: (time: number) => void;
}

export function WaveformViewer({ meetingId, onSeek }: WaveformViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Generate mock waveform
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 100;

    // Draw waveform
    ctx.fillStyle = 'hsl(var(--muted))';
    const barWidth = 4;
    const gap = 2;
    const barCount = Math.floor(canvas.width / (barWidth + gap));

    for (let i = 0; i < barCount; i++) {
      const height = Math.random() * 80 + 10;
      const x = i * (barWidth + gap);
      const y = (canvas.height - height) / 2;
      ctx.fillRect(x, y, barWidth, height);
    }

    // Mock duration
    setDuration(300); // 5 minutes
  }, [meetingId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    setCurrentTime(time);
    onSeek(time);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual audio playback
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(newTime);
    onSeek(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full cursor-pointer"
            onClick={handleCanvasClick}
          />
          {/* Progress indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => skip(-5)}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => skip(5)}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </Card>
  );
}
