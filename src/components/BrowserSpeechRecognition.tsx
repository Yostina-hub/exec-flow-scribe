import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Clock, Languages, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BrowserSpeechRecognitionProps {
  meetingId: string;
  externalIsRecording?: boolean;
  isPaused?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (durationSeconds?: number) => void;
  onDurationChange?: (seconds: number) => void;
}

export const BrowserSpeechRecognition = ({ 
  meetingId, 
  externalIsRecording = false,
  isPaused = false,
  onRecordingStart,
  onRecordingStop,
  onDurationChange
}: BrowserSpeechRecognitionProps) => {
  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
    setLanguage,
  } = useSpeechRecognition();

  const [selectedLanguage, setSelectedLanguage] = useState('am-ET');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Audio recording hook for archiving
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording: pauseAudioRecording,
    resumeRecording: resumeAudioRecording,
    clearRecording: clearAudioRecording,
    audioBlob,
    error: audioError
  } = useAudioRecording();

  // Track previous external recording and pause states
  const prevExternalRef = useRef(externalIsRecording);
  const prevPausedRef = useRef(isPaused);

  // Get current user info
  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
      }
    };
    getUserInfo();
  }, []);

  // Sync with external recording and pause state
  useEffect(() => {
    const prevExternal = prevExternalRef.current;
    const prevPaused = prevPausedRef.current;

    if (!externalIsRecording) {
      // Meeting recording stopped: ensure we stop and save once
      if (isListening) {
        stopListening();
        stopAudioRecording();
      }
      if (transcript.trim()) {
        handleSave();
      }
    } else {
      // Recording is active
      if (isPaused) {
        // Pause listening and audio without clearing
        if (isListening) {
          stopListening();
          pauseAudioRecording();
        }
      } else {
        // Active and not paused → ensure listening
        if (!isListening) {
          // New session start (rising edge) → clear and start
          if (!prevExternal) {
            resetTranscript();
            setRecordingDuration(0);
            clearAudioRecording();
            startAudioRecording();
          } else {
            // Resuming from pause
            resumeAudioRecording();
          }
          startListening(selectedLanguage);
        }
      }
    }

    // Update previous flags
    prevExternalRef.current = externalIsRecording;
    prevPausedRef.current = isPaused;
  }, [externalIsRecording, isPaused, isListening, selectedLanguage, transcript]);

useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          onDurationChange?.(next);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isListening, onDurationChange]);


  const handleSave = async (audioFile?: Blob | null) => {
    if (!transcript.trim() && !audioFile) return;

    setIsSaving(true);
    try {
      // Save transcription
      if (transcript.trim()) {
        const { error: saveErr } = await supabase.functions.invoke('save-transcription', {
          body: {
            meetingId,
            content: transcript,
            timestamp: new Date().toISOString(),
            speaker: userName,
            detectedLanguage: selectedLanguage,
          },
        });

        if (saveErr) throw saveErr;
      }

      // Upload audio file to storage
      if (audioFile && userId) {
        const timestamp = Date.now();
        const fileName = `${userId}/${meetingId}/${timestamp}.webm`;
        
        const { error: uploadError } = await supabase.storage
          .from('meeting-audio')
          .upload(fileName, audioFile, {
            contentType: audioFile.type,
            cacheControl: '3600',
          });

        if (uploadError) {
          console.error('Audio upload error:', uploadError);
          throw new Error('Failed to upload audio');
        }

        // Save audio reference in meeting_media table
        const { data: { publicUrl } } = supabase.storage
          .from('meeting-audio')
          .getPublicUrl(fileName);

        const { error: mediaError } = await supabase
          .from('meeting_media')
          .insert({
            meeting_id: meetingId,
            media_type: 'audio',
            file_url: fileName,
            format: audioFile.type.split('/')[1],
            file_size: audioFile.size,
            duration_seconds: recordingDuration,
            uploaded_by: userId,
            checksum: `audio-${timestamp}`,
          });

        if (mediaError) {
          console.error('Media reference error:', mediaError);
        }
      }

      toast({
        title: 'Saved successfully',
        description: audioFile ? 'Transcription and audio saved' : 'Transcription saved',
      });

    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    resetTranscript();
    setRecordingDuration(0);
    clearAudioRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Browser Speech Recognition</CardTitle>
          <CardDescription className="text-destructive">
            Your browser doesn't support speech recognition. Please use Chrome or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speech to Text</CardTitle>
        <CardDescription>Click the microphone to start recording</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Languages className="w-4 h-4" />
            Language
          </label>
          <Select
            value={selectedLanguage}
            onValueChange={(value) => {
              setSelectedLanguage(value);
              setLanguage(value);
            }}
            disabled={isListening}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="am-ET">Amharic (አማርኛ)</SelectItem>
              <SelectItem value="en-US">English (US)</SelectItem>
              <SelectItem value="en-GB">English (UK)</SelectItem>
              <SelectItem value="ar-SA">Arabic (العربية)</SelectItem>
              <SelectItem value="es-ES">Spanish (Español)</SelectItem>
              <SelectItem value="fr-FR">French (Français)</SelectItem>
              <SelectItem value="de-DE">German (Deutsch)</SelectItem>
              <SelectItem value="zh-CN">Chinese (中文)</SelectItem>
              <SelectItem value="ja-JP">Japanese (日本語)</SelectItem>
              <SelectItem value="ko-KR">Korean (한국어)</SelectItem>
              <SelectItem value="hi-IN">Hindi (हिन्दी)</SelectItem>
              <SelectItem value="sw-KE">Swahili (Kiswahili)</SelectItem>
              <SelectItem value="so-SO">Somali (Soomaali)</SelectItem>
              <SelectItem value="om-ET">Oromo (Oromoo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-center gap-6">
          {isListening && (
            <div className="flex flex-col items-center gap-2">
              <Badge variant="destructive" className="gap-2 text-base px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Recording
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span className="text-3xl font-mono font-bold">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            </div>
          )}

          {!isListening && externalIsRecording && isPaused && (
            <div className="flex flex-col items-center gap-2">
              <Badge variant="warning" className="gap-2 text-base px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-white" />
                Paused
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span className="text-3xl font-mono font-bold">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            </div>
          )}

          {!isListening && !externalIsRecording && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Use the <strong>"Start Recording"</strong> button above to begin transcription
              </p>
            </div>
          )}
        </div>

        <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-muted rounded-lg p-4">
          {transcript ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">{userName}</Badge>
                <p className="text-lg leading-relaxed flex-1">{transcript}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center italic">
              Your transcription will appear here...
            </p>
          )}
        </div>

        {(error || audioError) && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error || audioError}</p>
          </div>
        )}

        {audioBlob && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Volume2 className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Audio recorded</p>
              <p className="text-xs text-muted-foreground">
                Size: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB • Duration: {formatDuration(recordingDuration)}
              </p>
            </div>
          </div>
        )}

        {transcript && !isListening && (
          <Button
            onClick={handleClear}
            variant="outline"
            className="w-full gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear & Start New
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
