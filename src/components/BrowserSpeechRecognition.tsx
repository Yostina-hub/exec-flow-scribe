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
}

export const BrowserSpeechRecognition = ({ meetingId }: BrowserSpeechRecognitionProps) => {
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
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const handleStartStop = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setRecordingDuration(0);
      startListening(selectedLanguage);
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
          speaker: 'User',
          detectedLanguage: selectedLanguage,
        },
      });

      if (saveErr) throw saveErr;

      toast({
        title: 'Saved successfully',
        description: 'Transcription saved to meeting',
      });

      resetTranscript();
      setRecordingDuration(0);
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Browser Speech Recognition</CardTitle>
            <CardDescription>Real-time speech-to-text using your browser</CardDescription>
          </div>
          {isListening && (
            <Badge variant="destructive" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Recording
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-2xl font-mono font-semibold">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleStartStop}
            size="lg"
            className={`w-20 h-20 rounded-full ${
              isListening
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
        </div>

        <div className="min-h-[200px] max-h-[300px] overflow-y-auto bg-muted rounded-lg p-4">
          {transcript ? (
            <p className="text-lg leading-relaxed">{transcript}</p>
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

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!transcript.trim() || isSaving}
            className="flex-1 gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={handleClear}
            disabled={!transcript}
            variant="outline"
            className="flex-1 gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
