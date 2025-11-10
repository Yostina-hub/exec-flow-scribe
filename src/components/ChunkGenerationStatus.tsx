import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Circle, Clock, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChunkStatus {
  chunk_number: number;
  start_time: number;
  end_time: number;
  status: 'completed' | 'pending' | 'processing';
  summary?: string;
  generated_at?: string;
}

interface ChunkGenerationStatusProps {
  meetingId: string;
  recordingDuration?: number; // in seconds
}

export const ChunkGenerationStatus = ({ meetingId, recordingDuration }: ChunkGenerationStatusProps) => {
  const [chunks, setChunks] = useState<ChunkStatus[]>([]);
  const [chunkDuration, setChunkDuration] = useState(300); // default 5 minutes
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChunkDuration();
    loadChunks();
    subscribeToChunks();
  }, [meetingId]);

  const loadChunkDuration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('minute_generation_settings')
        .select('chunk_duration_minutes')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.chunk_duration_minutes) {
        setChunkDuration(data.chunk_duration_minutes * 60);
      }
    } catch (error) {
      console.error('Error loading chunk duration:', error);
    }
  };

  const loadChunks = async () => {
    try {
      const { data, error } = await supabase
        .from('minute_chunks')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('chunk_number', { ascending: true });

      if (error) throw error;

      // Create chunk status array including pending chunks
      const chunkStatuses: ChunkStatus[] = [];
      
      if (recordingDuration) {
        const totalChunks = Math.ceil(recordingDuration / chunkDuration);
        
        for (let i = 0; i < totalChunks; i++) {
          const existingChunk = data?.find(c => c.chunk_number === i);
          
          chunkStatuses.push({
            chunk_number: i,
            start_time: i * chunkDuration,
            end_time: Math.min((i + 1) * chunkDuration, recordingDuration),
            status: existingChunk ? 'completed' : 'pending',
            summary: existingChunk?.summary,
            generated_at: existingChunk?.generated_at,
          });
        }
      } else if (data) {
        // If no recording duration, just show completed chunks
        chunkStatuses.push(...data.map(chunk => ({
          chunk_number: chunk.chunk_number,
          start_time: chunk.start_time,
          end_time: chunk.end_time,
          status: 'completed' as const,
          summary: chunk.summary,
          generated_at: chunk.generated_at,
        })));
      }

      setChunks(chunkStatuses);
    } catch (error) {
      console.error('Error loading chunks:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChunks = () => {
    const channel = supabase
      .channel(`chunk-status-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'minute_chunks',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          console.log('Chunk update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newChunk = payload.new as any;
            setChunks(prev => {
              const updated = prev.map(c => 
                c.chunk_number === newChunk.chunk_number
                  ? {
                      ...c,
                      status: 'completed' as const,
                      summary: newChunk.summary,
                      generated_at: newChunk.generated_at,
                    }
                  : c
              );
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const completedChunks = chunks.filter(c => c.status === 'completed').length;
  const totalChunks = chunks.length;
  const progressPercentage = totalChunks > 0 ? (completedChunks / totalChunks) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (chunks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>Chunk Generation Status</CardTitle>
          </div>
          <Badge variant="secondary">
            {completedChunks}/{totalChunks} Completed
          </Badge>
        </div>
        <CardDescription>
          Real-time processing of {Math.floor(chunkDuration / 60)}-minute segments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {chunks.map((chunk) => (
            <div
              key={chunk.chunk_number}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all",
                chunk.status === 'completed' && "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
                chunk.status === 'processing' && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
                chunk.status === 'pending' && "bg-muted/50 border-border"
              )}
            >
              <div className="mt-0.5">
                {chunk.status === 'completed' && (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
                {chunk.status === 'processing' && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                )}
                {chunk.status === 'pending' && (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      Segment {chunk.chunk_number + 1}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {formatTime(chunk.start_time)} - {formatTime(chunk.end_time)}
                    </Badge>
                  </div>
                  {chunk.generated_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(chunk.generated_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                
                {chunk.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {chunk.summary}
                  </p>
                )}
                
                {chunk.status === 'pending' && (
                  <p className="text-xs text-muted-foreground">
                    Waiting for recording to reach this segment...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {completedChunks > 0 && completedChunks < totalChunks && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 Chunks are being processed automatically every {Math.floor(chunkDuration / 60)} minutes. 
              Final minutes will be faster since segments are pre-analyzed.
            </p>
          </div>
        )}

        {completedChunks === totalChunks && totalChunks > 0 && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 border border-green-200 dark:border-green-900">
            <p className="text-sm text-green-900 dark:text-green-100">
              ✓ All segments processed! Final minute generation will use these pre-analyzed chunks.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};