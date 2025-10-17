import { useEffect, useRef, useState } from 'react';
import { OpenAIRealtimeClient } from '@/utils/openaiRealtime';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useOpenAIRealtime = (meetingId: string, enabled: boolean) => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; speaker: string; id: string; language?: string }>>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<string>('en');
  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled || !meetingId) return;

    // Fetch user's language preference and then connect
    const initializeConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('transcription_preferences')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();

        const userLanguage = data?.language || 'en';
        setLanguage(userLanguage);
        console.log('🌐 Using transcription language:', userLanguage);

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
          setIsProcessing(false);
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
          (processing) => setIsProcessing(processing),
          userLanguage
        );
        clientRef.current = client;

        await client.connect(meetingId);
        setIsConnected(true);
        toast({
          title: 'Connected',
          description: `Real-time transcription active for ${userLanguage === 'am' ? 'Amharic' : userLanguage === 'ar' ? 'Arabic' : 'English'}`,
        });
      } catch (err: any) {
        console.error('Failed to connect:', err);
        toast({
          title: 'Connection Failed',
          description: err.message || 'Failed to connect',
          variant: 'destructive',
        });
      }
    };

    initializeConnection();

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setIsConnected(false);
    };
  }, [meetingId, enabled, toast]);

  const sendText = (text: string) => {
    clientRef.current?.sendText(text);
  };

  return { isConnected, transcripts, sendText, rateLimited, isProcessing };
};