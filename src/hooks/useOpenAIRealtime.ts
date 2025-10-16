import { useEffect, useRef, useState } from 'react';
import { OpenAIRealtimeClient } from '@/utils/openaiRealtime';
import { useToast } from '@/hooks/use-toast';

export const useOpenAIRealtime = (meetingId: string, enabled: boolean) => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; speaker: string; id: string; language?: string }>>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled || !meetingId) return;

    const handleTranscript = (text: string, speaker: string = 'Speaker') => {
      setTranscripts(prev => {
        const lastTranscript = prev[prev.length - 1];
        // If same speaker, append to last transcript
        if (lastTranscript && lastTranscript.speaker === speaker) {
          return [
            ...prev.slice(0, -1),
            { ...lastTranscript, text: lastTranscript.text + text }
          ];
        }
        // New speaker or first transcript
        return [...prev, { text, speaker, id: `${Date.now()}-${Math.random()}` }];
      });
    };

    const handleError = (error: string) => {
      console.error('Realtime error:', error);
      setIsProcessing(false); // Always clear processing state on error
      const isRateLimited = /429|rate limit|Too Many Requests/i.test(error);
      toast({
        title: isRateLimited ? 'Rate Limited' : 'Connection Error',
        description: isRateLimited
          ? 'OpenAI Realtime hit rate limits. We will retry in 10s. You can switch to Browser Whisper in Settings > Transcription.'
          : error,
        variant: 'destructive',
      });
      setIsConnected(false);
      setRateLimited(isRateLimited);

      // Backoff + retry on rate limits
      if (isRateLimited && clientRef.current) {
        try { clientRef.current.disconnect(); } catch {}
        setTimeout(() => {
          clientRef.current?.connect(meetingId)
            .then(() => {
              setIsConnected(true);
              setRateLimited(false);
              toast({ title: 'Reconnected', description: 'Realtime transcription resumed.' });
            })
            .catch((err) => {
              console.error('Retry connect failed:', err);
            });
        }, 10_000);
      }
    };

    const client = new OpenAIRealtimeClient(
      handleTranscript, 
      handleError,
      (processing) => setIsProcessing(processing)
    );
    clientRef.current = client;

    client.connect(meetingId).then(() => {
      setIsConnected(true);
      toast({
        title: 'Connected',
        description: 'Real-time transcription active with advanced features',
      });
    }).catch((err) => {
      handleError(err.message || 'Failed to connect');
    });

    return () => {
      client.disconnect();
      setIsConnected(false);
    };
  }, [meetingId, enabled, toast]);

  const sendText = (text: string) => {
    clientRef.current?.sendText(text);
  };

  return { isConnected, transcripts, sendText, rateLimited, isProcessing };
};