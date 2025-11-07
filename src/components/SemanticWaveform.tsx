import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, SkipBack, SkipForward, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmotionSegment {
  start: number;
  end: number;
  emotion: string;
  sentiment: string;
  energy: string;
}

interface SemanticWaveformProps {
  meetingId: string;
  audioUrl?: string;
  onSeek: (time: number) => void;
}

// Emotion color mapping
const EMOTION_COLORS: Record<string, string> = {
  joy: '#10b981',        // green
  confidence: '#3b82f6', // blue
  excitement: '#f59e0b', // amber
  neutral: '#6b7280',    // gray
  anxiety: '#f97316',    // orange
  frustration: '#ef4444',// red
  anger: '#dc2626',      // dark red
  sadness: '#6366f1',    // indigo
  fear: '#8b5cf6',       // purple
  surprise: '#ec4899',   // pink
};

export function SemanticWaveform({ meetingId, audioUrl, onSeek }: SemanticWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [emotionSegments, setEmotionSegments] = useState<EmotionSegment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch emotional analysis data
  useEffect(() => {
    const fetchEmotions = async () => {
      const { data: transcriptions } = await supabase
        .from('transcriptions')
        .select(`
          id,
          timestamp,
          emotional_analysis (
            primary_emotion,
            sentiment,
            energy_level
          )
        `)
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (transcriptions) {
        const segments: EmotionSegment[] = [];
        transcriptions.forEach((trans: any, index) => {
          if (trans.emotional_analysis && trans.emotional_analysis.length > 0) {
            const emotion = trans.emotional_analysis[0];
            const start = new Date(trans.timestamp).getTime();
            const end = index < transcriptions.length - 1 
              ? new Date(transcriptions[index + 1].timestamp).getTime()
              : start + 10000; // 10 seconds default

            segments.push({
              start: (start - new Date(transcriptions[0].timestamp).getTime()) / 1000,
              end: (end - new Date(transcriptions[0].timestamp).getTime()) / 1000,
              emotion: emotion.primary_emotion,
              sentiment: emotion.sentiment,
              energy: emotion.energy_level,
            });
          }
        });
        setEmotionSegments(segments);
      }
      setLoading(false);
    };

    fetchEmotions();
  }, [meetingId]);

  // Draw semantic waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || emotionSegments.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 120;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate total duration from segments
    const totalDuration = Math.max(...emotionSegments.map(s => s.end));
    if (totalDuration > 0) setDuration(totalDuration);

    // Draw emotion-colored waveform bars
    const barWidth = 3;
    const gap = 1;
    const barCount = Math.floor(canvas.width / (barWidth + gap));

    for (let i = 0; i < barCount; i++) {
      const timePoint = (i / barCount) * totalDuration;
      
      // Find emotion at this time point
      const segment = emotionSegments.find(s => timePoint >= s.start && timePoint < s.end);
      const emotion = segment?.emotion || 'neutral';
      const energy = segment?.energy || 'medium';
      
      // Set color based on emotion
      ctx.fillStyle = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
      
      // Height varies by energy level
      const baseHeight = 40;
      const heightMultiplier = energy === 'high' ? 1.5 : energy === 'low' ? 0.6 : 1.0;
      const randomVariation = Math.random() * 30;
      const height = (baseHeight * heightMultiplier + randomVariation);
      
      const x = i * (barWidth + gap);
      const y = (canvas.height - height) / 2;
      
      // Add slight gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, ctx.fillStyle);
      gradient.addColorStop(1, ctx.fillStyle + '80');
      ctx.fillStyle = gradient;
      
      ctx.fillRect(x, y, barWidth, height);
    }
  }, [emotionSegments]);

  // Audio playback control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audioUrl]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    setCurrentTime(time);
    onSeek(time);
    
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    onSeek(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current emotion
  const currentEmotion = emotionSegments.find(
    s => currentTime >= s.start && currentTime < s.end
  );

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Semantic Waveform</h3>
        </div>
        {currentEmotion && (
          <Badge 
            variant="outline"
            style={{ 
              borderColor: EMOTION_COLORS[currentEmotion.emotion],
              color: EMOTION_COLORS[currentEmotion.emotion]
            }}
          >
            {currentEmotion.emotion} • {currentEmotion.energy} energy
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading emotion data...
        </div>
      ) : (
        <>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full cursor-pointer rounded-lg"
              onClick={handleCanvasClick}
            />
            {/* Progress indicator */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-foreground/80 rounded-full shadow-lg"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => skip(-5)}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={togglePlay} disabled={!audioUrl}>
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

          {/* Emotion Legend */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {Object.entries(EMOTION_COLORS).slice(0, 6).map(([emotion, color]) => (
              <div key={emotion} className="flex items-center gap-1.5 text-xs">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground capitalize">{emotion}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}
    </Card>
  );
}
