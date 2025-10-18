import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtime';
import { Mic, Square, Pause, Play, Trash2, Upload, Clock, Star, Loader2 } from 'lucide-react';

interface Transcription {
  id: string;
  content: string;
  speaker_name: string | null;
  timestamp: string;
  confidence_score: number | null;
}

interface UnifiedRecordingPanelProps {
  meetingId: string;
  isRecording: boolean;
  isPaused: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onDurationChange: (seconds: number) => void;
}

const stringToUUID = (input: string) => {
  const s = String(input);
  let h1 = 0xdeadbeef >>> 0, h2 = 0x41c6ce57 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761) >>> 0;
    h2 = Math.imul(h2 ^ ch, 1597334677) >>> 0;
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  const bytes = new Uint8Array(16);
  const v = new DataView(bytes.buffer);
  v.setUint32(0, h1);
  v.setUint32(4, h2);
  v.setUint32(8, h1 ^ h2);
  v.setUint32(12, (h1 >>> 1) ^ (h2 << 1));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

const normalizeMeetingId = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : stringToUUID(id);
};

const SPEAKER_COLORS: Record<string, string> = {
  'User': 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  'Assistant': 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  'Speaker': 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
};

export function UnifiedRecordingPanel({
  meetingId,
  isRecording,
  isPaused,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onDurationChange,
}: UnifiedRecordingPanelProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [useRealtime, setUseRealtime] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const {
    audioBlob,
    audioDuration,
    error: recordingError,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording: pauseAudioRecording,
    resumeRecording: resumeAudioRecording,
    clearRecording,
  } = useAudioRecording();

  const normalizedId = normalizeMeetingId(meetingId);
  
  const { isConnected, transcripts: realtimeTranscripts, rateLimited, isProcessing } = useOpenAIRealtime(
    normalizedId,
    useRealtime && isRecording
  );

  // Sync recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => {
          const newValue = prev + 1;
          onDurationChange(newValue);
          return newValue;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused, onDurationChange]);

  useEffect(() => {
    const checkRealtimeMode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('transcription_preferences')
        .select('provider')
        .eq('user_id', user.id)
        .maybeSingle();

      const p = data?.provider as string | undefined;
      setUseRealtime(p === 'openai_realtime' || p === 'lovable_ai' || !p);
    };

    checkRealtimeMode();

    const fetchTranscriptions = async () => {
      const { data, error } = await supabase.functions.invoke('list-transcriptions', {
        body: { meetingId: normalizedId }
      });

      if (error) {
        console.error('Error fetching transcriptions:', error);
      } else if (data?.transcriptions) {
        setTranscriptions(data.transcriptions);
      }
    };

    fetchTranscriptions();

    const channel = supabase
      .channel('transcriptions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcriptions',
          filter: `meeting_id=eq.${normalizedId}`,
        },
        (payload) => {
          setTranscriptions((prev) => [...prev, payload.new as Transcription]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleStart = async () => {
    setRecordingSeconds(0);
    await startAudioRecording();
    onStartRecording();
  };

  const handleStop = async () => {
    await stopAudioRecording();
    onStopRecording();
  };

  const handlePause = async () => {
    await pauseAudioRecording();
    onPauseRecording();
  };

  const handleResume = async () => {
    await resumeAudioRecording();
    onResumeRecording();
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${meetingId}-${Date.now()}.webm`;
      const filePath = `${meetingId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-audio')
        .getPublicUrl(filePath);

      const checksum = await generateChecksum(audioBlob);

      const { error: insertError } = await supabase
        .from('meeting_media')
        .insert({
          meeting_id: meetingId,
          uploaded_by: user.id,
          file_url: publicUrl,
          media_type: 'audio',
          format: 'webm',
          file_size: audioBlob.size,
          duration_seconds: audioDuration,
          checksum,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Audio saved',
        description: 'Recording uploaded successfully',
      });

      clearRecording();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload recording',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const generateChecksum = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleHighlight = async (transcriptionId: string, content: string) => {
    const { error } = await supabase.from('highlights').insert({
      meeting_id: normalizedId,
      content,
      timestamp: new Date().toISOString(),
      tagged_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) {
      toast({
        title: 'Failed to highlight',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Highlight added',
        description: 'Important moment tagged',
      });
    }
  };

  const hasContent = transcriptions.length > 0 || realtimeTranscripts.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Recording & Transcription</CardTitle>
            <CardDescription>
              Record audio and capture real-time transcription simultaneously
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {useRealtime && isConnected && (
              <Badge variant="secondary" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                AI Mode
              </Badge>
            )}
            {isProcessing && (
              <Badge variant="outline" className="gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing
              </Badge>
            )}
            {isRecording && (
              <Badge variant="destructive" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                {isPaused ? 'Paused' : 'Recording'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                isRecording && !isPaused ? 'bg-destructive animate-pulse' : 'bg-primary/10'
              }`}>
                <Mic className={`h-6 w-6 ${isRecording && !isPaused ? 'text-white' : 'text-primary'}`} />
              </div>
              <div>
                <p className="font-medium text-lg">
                  {isRecording ? (isPaused ? 'Recording Paused' : 'Recording in Progress') : 'Ready to Record'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {formatDuration(recordingSeconds)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {!isRecording && !audioBlob && (
                <Button onClick={handleStart} size="lg" className="gap-2">
                  <Mic className="h-4 w-4" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <>
                  {!isPaused ? (
                    <Button variant="outline" onClick={handlePause} size="lg">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleResume} size="lg">
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  <Button variant="destructive" onClick={handleStop} size="lg">
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              )}

              {audioBlob && !isRecording && (
                <>
                  <Button variant="outline" onClick={clearRecording}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button onClick={handleUpload} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Saving...' : 'Save Audio'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {recordingError && (
            <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {recordingError}
            </div>
          )}

          {audioBlob && (
            <div className="mt-4 pt-4 border-t">
              <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
            </div>
          )}
        </div>

        <Separator />

        {/* Transcription Display */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Live Transcription</h3>
            {isRecording && (
              <p className="text-sm text-muted-foreground">
                Transcribing in real-time...
              </p>
            )}
          </div>

          {!hasContent && !isRecording ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Start recording to begin live transcription
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {useRealtime && realtimeTranscripts.length > 0 && (
                  <>
                    {realtimeTranscripts.map((rt) => (
                      <div key={rt.id} className="animate-fade-in">
                        <div className="p-4 rounded-lg bg-muted/50 border-l-4" style={{ borderLeftColor: rt.speaker === 'User' ? '#3b82f6' : '#a855f7' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${SPEAKER_COLORS[rt.speaker] || SPEAKER_COLORS['Speaker']}`}
                            >
                              {rt.speaker}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Live</span>
                          </div>
                          <p className="text-sm leading-relaxed">{rt.text}</p>
                        </div>
                      </div>
                    ))}
                    {transcriptions.length > 0 && <Separator className="my-4" />}
                  </>
                )}
                {transcriptions.map((transcript, index) => (
                  <div key={transcript.id}>
                    <div className="group relative p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${SPEAKER_COLORS[transcript.speaker_name || 'Speaker'] || SPEAKER_COLORS['Speaker']}`}
                          >
                            {transcript.speaker_name || 'Speaker'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(transcript.timestamp)}
                          </span>
                          {transcript.confidence_score && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round(transcript.confidence_score * 100)}% confidence
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity gap-2"
                          onClick={() => handleHighlight(transcript.id, transcript.content)}
                        >
                          <Star className="h-3 w-3" />
                          Highlight
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed">{transcript.content}</p>
                    </div>
                    {index < transcriptions.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
