import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

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

export const LiveTranscription = ({ meetingId, isRecording }: LiveTranscriptionProps) => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const { toast } = useToast();

  const normalizedId = normalizeMeetingId(meetingId);

  useEffect(() => {
    // Fetch existing transcriptions
    const fetchTranscriptions = async () => {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', normalizedId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching transcriptions:', error);
      } else if (data) {
        setTranscriptions(data);
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
            <CardDescription>Real-time meeting transcript with speaker detection</CardDescription>
          </div>
          {isRecording && (
            <Badge variant="destructive" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Recording
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {transcriptions.map((transcript, index) => (
              <div key={transcript.id}>
                <div className="group relative p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
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
      </CardContent>
    </Card>
  );
};
