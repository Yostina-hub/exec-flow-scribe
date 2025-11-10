import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Circle, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JitsiMeetEmbedProps {
  roomName: string;
  displayName?: string;
  meetingId?: string;
  onMeetingEnd?: () => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  width?: string;
  height?: string;
  autoStartRecording?: boolean;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function JitsiMeetEmbed({
  roomName,
  displayName = 'Guest',
  meetingId,
  onMeetingEnd,
  onRecordingStart,
  onRecordingStop,
  width = '100%',
  height = '600px',
  autoStartRecording = false,
}: JitsiMeetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useLocalRecording, setUseLocalRecording] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load Jitsi Meet External API
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = initializeJitsi;
    document.body.appendChild(script);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      document.body.removeChild(script);
    };
  }, []);

  const initializeJitsi = () => {
    if (!containerRef.current || !window.JitsiMeetExternalAPI) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName,
      width,
      height,
      parentNode: containerRef.current,
      userInfo: {
        displayName,
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'profile',
          'chat',
          'recording',
          'livestreaming',
          'etherpad',
          'sharedvideo',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'feedback',
          'stats',
          'shortcuts',
          'tileview',
          'download',
          'help',
          'mute-everyone',
        ],
      },
    };

    apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    apiRef.current.addEventListener('videoConferenceLeft', () => {
      onMeetingEnd?.();
    });

    apiRef.current.addEventListener('readyToClose', () => {
      onMeetingEnd?.();
    });

    // Auto-start recording if enabled
    if (autoStartRecording && meetingId) {
      // Small delay to ensure room is ready
      setTimeout(() => startRecording(), 3000);
    }
  };

  const startRecording = async () => {
    if (!meetingId || isRecording) return;

    try {
      const { data, error } = await supabase.functions.invoke('jitsi-recording-control', {
        body: {
          action: 'start',
          meetingId,
          roomName
        }
      });

      if (error) throw error;

      setIsRecording(true);
      setUseLocalRecording(data?.useLocalRecording || false);

      toast({
        title: data?.useLocalRecording ? 'Local Recording Active' : 'Jitsi Recording Started',
        description: data?.useLocalRecording 
          ? 'Using local audio capture for recording'
          : 'Conference is being recorded and will be transcribed',
      });

      onRecordingStart?.();

      // Also try to trigger Jitsi's built-in recording button
      if (apiRef.current && !data?.useLocalRecording) {
        apiRef.current.executeCommand('startRecording', {
          mode: 'file',
          appData: JSON.stringify({ meetingId })
        });
      }
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Recording Start Failed',
        description: 'Using local audio recording instead',
        variant: 'destructive',
      });
      // Fallback to local recording
      setUseLocalRecording(true);
      setIsRecording(true);
      onRecordingStart?.();
    }
  };

  const stopRecording = async () => {
    if (!meetingId || !isRecording) return;

    try {
      if (!useLocalRecording) {
        const { error } = await supabase.functions.invoke('jitsi-recording-control', {
          body: {
            action: 'stop',
            meetingId,
            roomName
          }
        });

        if (error) throw error;

        // Also stop Jitsi's built-in recording
        if (apiRef.current) {
          apiRef.current.executeCommand('stopRecording', 'file');
        }
      }

      setIsRecording(false);

      toast({
        title: 'Recording Stopped',
        description: useLocalRecording 
          ? 'Local recording saved'
          : 'Processing and transcribing conference recording...',
      });

      onRecordingStop?.();
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      toast({
        title: 'Recording Stop Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <Badge variant={isRecording ? 'destructive' : 'secondary'} className="gap-2">
            {isRecording && <Circle className="h-2 w-2 fill-current animate-pulse" />}
            {isRecording ? (useLocalRecording ? 'Local Recording' : 'Conference Recording') : 'Not Recording'}
          </Badge>
          {useLocalRecording && isRecording && (
            <span className="text-xs text-muted-foreground">
              Use the audio recorder below to capture your audio
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isRecording ? (
            <Button onClick={startRecording} size="sm" variant="default">
              <Circle className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button onClick={stopRecording} size="sm" variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}
        </div>
      </div>
      <div ref={containerRef} style={{ width, height }} />
    </Card>
  );
}
