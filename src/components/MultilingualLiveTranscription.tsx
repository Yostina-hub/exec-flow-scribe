import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mic, Square, Languages, Loader2 } from 'lucide-react';
import { detectLanguage } from '@/utils/langDetect';

interface TranscriptSegment {
  id: string;
  text: string;
  language: string;
  languageName: string;
  timestamp: Date;
  speaker?: string;
}

interface MultilingualLiveTranscriptionProps {
  meetingId: string;
  onTranscriptUpdate?: (segments: TranscriptSegment[]) => void;
}

export const MultilingualLiveTranscription = ({
  meetingId,
  onTranscriptUpdate,
}: MultilingualLiveTranscriptionProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<string>('Detecting...');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const languageColors: Record<string, string> = {
    'am': 'bg-green-500',
    'en': 'bg-blue-500',
    'ar': 'bg-purple-500',
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        chunksRef.current = [];
      };

      // Record in chunks of 10 seconds for near real-time transcription
      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop and restart every 10 seconds for continuous transcription
      const intervalId = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setTimeout(() => {
            if (streamRef.current && streamRef.current.active) {
              chunksRef.current = [];
              mediaRecorder.start();
            }
          }, 100);
        }
      }, 10000);

      // Store interval ID for cleanup
      (mediaRecorder as any).intervalId = intervalId;

      toast({
        title: 'Recording Started',
        description: 'Multilingual transcription is active',
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start recording',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      const intervalId = (mediaRecorderRef.current as any).intervalId;
      if (intervalId) {
        clearInterval(intervalId);
      }

      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setCurrentLanguage('Detecting...');

    toast({
      title: 'Recording Stopped',
      description: 'Transcription has ended',
    });
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      const base64Audio = await base64Promise;

      // Call transcription function
      const { data, error } = await supabase.functions.invoke('transcribe-multilingual', {
        body: {
          audio: base64Audio,
          meetingId,
        },
      });

      if (error) throw error;

      if (data?.text && data.text.trim()) {
        const newSegment: TranscriptSegment = {
          id: `${Date.now()}-${Math.random()}`,
          text: data.text,
          language: data.language || 'unknown',
          languageName: data.languageName || 'Unknown',
          timestamp: new Date(),
        };

        setTranscripts(prev => {
          const updated = [...prev, newSegment];
          onTranscriptUpdate?.(updated);
          return updated;
        });

        setCurrentLanguage(data.languageName || 'Unknown');

        // Save to database
        await supabase.from('transcriptions').insert({
          meeting_id: meetingId,
          content: data.text,
          speaker_name: 'Auto-detected',
          confidence_score: 0.9,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: 'Transcription Error',
        description: error.message || 'Failed to transcribe audio',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Multilingual Live Transcription
          </div>
          <Badge variant={isRecording ? 'destructive' : 'outline'}>
            {isRecording ? 'Recording' : 'Stopped'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Language:</span>
            <Badge variant="secondary">{currentLanguage}</Badge>
          </div>
          
          <div className="flex gap-2">
            {!isRecording ? (
              <Button onClick={startRecording} className="gap-2">
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing audio...
          </div>
        )}

        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-3">
            {transcripts.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Languages className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No transcriptions yet. Start recording to begin.</p>
                <p className="text-xs mt-1">Supports Amharic, English, and Arabic</p>
              </div>
            ) : (
              transcripts.map((segment) => (
                <div
                  key={segment.id}
                  className="p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      className={`${languageColors[segment.language] || 'bg-gray-500'} text-white`}
                    >
                      {segment.languageName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {segment.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{segment.text}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="text-xs text-muted-foreground">
          <p>💡 Automatic language detection for Amharic (አማርኛ), English, and Arabic (العربية)</p>
          <p>📝 Transcriptions are saved automatically and can be used for meeting minutes</p>
        </div>
      </CardContent>
    </Card>
  );
};
