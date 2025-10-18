import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Save, Trash2, Clock, Languages } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BrowserSpeechRecognitionProps {
  meetingId: string;
  externalIsRecording?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export const BrowserSpeechRecognition = ({ 
  meetingId, 
  externalIsRecording = false,
  onRecordingStart,
  onRecordingStop 
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
  const { toast } = useToast();

  // Get current user name for speaker identification
  useEffect(() => {
    const getUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
    getUserName();
  }, []);

  // Sync with external recording state
  useEffect(() => {
    if (externalIsRecording && !isListening) {
      resetTranscript();
      setRecordingDuration(0);
      startListening(selectedLanguage);
    } else if (!externalIsRecording && isListening) {
      stopListening();
      if (transcript.trim()) {
        handleSave();
      }
    }
  }, [externalIsRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const handleStartStop = async () => {
    if (isListening) {
      stopListening();
      onRecordingStop?.();
      // Auto-save when stopping if there's content
      if (transcript.trim()) {
        await handleSave();
      }
    } else {
      resetTranscript();
      setRecordingDuration(0);
      startListening(selectedLanguage);
      onRecordingStart?.();
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) return;

    setIsSaving(true);
    try {
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

      toast({
        title: 'Saved successfully',
        description: 'Transcription saved to meeting',
      });

      // Don't reset transcript - keep it visible after saving
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
          <Button
            onClick={handleStartStop}
            size="lg"
            disabled={isSaving}
            className={`w-24 h-24 rounded-full transition-all ${
              isListening
                ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isListening ? (
              <MicOff className="w-10 h-10" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </Button>

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

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
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
