import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtime';

interface Transcription {
  id: string;
  content: string;
  speaker_name: string | null;
  timestamp: string;
  confidence_score: number | null;
}

interface LiveTranscriptionProps {
  meetingId: string;
  isRecording: boolean;
  currentUserName: string;
}

// Normalize meeting IDs deterministically so client/server match without localStorage
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
  // RFC 4122 variant & version
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

const normalizeMeetingId = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : stringToUUID(id);
};

// Speaker colors - dynamically assign colors to different speakers
const SPEAKER_COLOR_PALETTE = [
  'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
  'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
  'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
  'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20',
  'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
];

const getSpeakerColor = (speaker: string, allSpeakers: string[]): string => {
  const index = allSpeakers.indexOf(speaker);
  return SPEAKER_COLOR_PALETTE[index % SPEAKER_COLOR_PALETTE.length];
};

export const LiveTranscription = ({ meetingId, isRecording, currentUserName }: LiveTranscriptionProps) => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [useRealtime, setUseRealtime] = useState(false);
  const [allSpeakers, setAllSpeakers] = useState<string[]>([]);
  const switchedRef = useState(false)[0] as unknown as { current: boolean };
  const { toast } = useToast();

  const normalizedId = normalizeMeetingId(meetingId);
  
  // Extract unique speakers for color mapping
  useEffect(() => {
    const speakers = [...new Set(transcriptions.map(t => t.speaker_name || 'Unknown Speaker'))];
    setAllSpeakers(speakers);
  }, [transcriptions]);
  
  const { isConnected, transcripts: realtimeTranscripts, rateLimited, isProcessing } = useOpenAIRealtime(
    normalizedId,
    useRealtime && isRecording,
    currentUserName
  );

  // Debug logging for production
  useEffect(() => {
    console.log('🎯 [PRODUCTION] LiveTranscription state:', {
      useRealtime,
      isRecording,
      isConnected,
      rateLimited,
      isProcessing,
      hasTranscripts: transcriptions.length,
      hasRealtimeTranscripts: realtimeTranscripts.length
    });
  }, [useRealtime, isRecording, isConnected, rateLimited, isProcessing, transcriptions.length, realtimeTranscripts.length]);

  useEffect(() => {
    // Check if realtime mode is enabled
    const checkRealtimeMode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('transcription_preferences')
        .select('provider')
        .eq('user_id', user.id)
        .maybeSingle();

      const p = data?.provider as string | undefined;
      // Treat 'openai_realtime' as well as 'lovable_ai' (default) as realtime mode
      setUseRealtime(p === 'openai_realtime' || p === 'lovable_ai' || !p);
    };

    checkRealtimeMode();

    // Fetch existing transcriptions using edge function to bypass RLS
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

    // Subscribe to real-time updates
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

  const switchToBrowser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: existing } = await supabase
        .from('transcription_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let err = null as any;
      if (existing) {
        const { error } = await supabase
          .from('transcription_preferences')
          .update({ provider: 'browser', openai_api_key: null })
          .eq('user_id', user.id);
        err = error;
      } else {
        const { error } = await supabase
          .from('transcription_preferences')
          .insert({ user_id: user.id, provider: 'browser' });
        err = error;
      }

      if (err) throw err;

      setUseRealtime(false);
      toast({ title: 'Switched to Browser Whisper', description: 'Stop and start recording to apply.' });
    } catch (e: any) {
      toast({ title: 'Failed to switch', description: e.message || 'Try again.', variant: 'destructive' });
    }
  };

  // Auto-fallback to browser transcription on rate limits or connection issues
  const autoSwitchedRef = useRef(false);
  useEffect(() => {
    if (!useRealtime || !isRecording) return;
    if (rateLimited || !isConnected) {
      if (!autoSwitchedRef.current) {
        autoSwitchedRef.current = true;
        switchToBrowser();
      }
    }
  }, [useRealtime, isRecording, rateLimited, isConnected]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (transcriptions.length === 0 && !isRecording) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Transcription</CardTitle>
          <CardDescription>Real-time speech-to-text will appear here</CardDescription>
      </CardHeader>
      {useRealtime && isRecording && (
        <div className="px-6 -mt-2">
          <div className="mb-4 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground flex items-center justify-between">
            <span>Seeing rate limits? Switch to Browser Whisper to continue locally.</span>
            <Button size="sm" variant="secondary" onClick={switchToBrowser}>Switch now</Button>
          </div>
        </div>
      )}
      <CardContent>
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Start recording to begin live transcription
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Transcription</CardTitle>
            <CardDescription>
              {useRealtime && isConnected ? 'Advanced real-time transcription with speaker detection' : 'Real-time meeting transcript with speaker detection'}
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
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Processing
              </Badge>
            )}
            {isRecording && !isProcessing && (
              <Badge variant="destructive" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Recording
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {useRealtime && realtimeTranscripts.length > 0 && (
              <>
                {realtimeTranscripts.map((rt) => {
                  const realtimeSpeakers = [...new Set(realtimeTranscripts.map(t => t.speaker))];
                  return (
                    <div key={rt.id} className="animate-fade-in">
                      <div className="p-4 rounded-lg bg-muted/50 border-l-4" style={{ borderLeftColor: rt.speaker === 'User' ? '#3b82f6' : '#a855f7' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getSpeakerColor(rt.speaker, realtimeSpeakers)}`}
                          >
                            {rt.speaker}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Live</span>
                        </div>
                        <p className="text-sm leading-relaxed">{rt.text}</p>
                      </div>
                    </div>
                  );
                })}
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
                        className={`text-xs ${getSpeakerColor(transcript.speaker_name || 'Unknown Speaker', allSpeakers)}`}
                      >
                        {transcript.speaker_name || 'Unknown Speaker'}
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
      </CardContent>
    </Card>
  );
};
