import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { playSuccessSound, playErrorSound } from '@/utils/soundEffects';

interface MinuteGenerationProgressProps {
  meetingId: string;
  isOpen: boolean;
  onComplete: () => void;
}

interface ProgressData {
  status: string;
  progress_percentage: number;
  current_step: string | null;
  estimated_completion_seconds: number | null;
  error_message: string | null;
}

const statusMessages: Record<string, string> = {
  initializing: 'Initializing generation...',
  fetching_data: 'Fetching meeting data...',
  analyzing: 'Analyzing transcription...',
  generating: 'Generating minutes with AI...',
  finalizing: 'Finalizing document...',
  completed: 'Minutes generated successfully!',
  failed: 'Generation failed'
};

const statusIcons: Record<string, React.ReactNode> = {
  initializing: <Loader2 className="h-6 w-6 animate-spin text-primary" />,
  fetching_data: <Loader2 className="h-6 w-6 animate-spin text-primary" />,
  analyzing: <Loader2 className="h-6 w-6 animate-spin text-primary" />,
  generating: <Loader2 className="h-6 w-6 animate-spin text-primary" />,
  finalizing: <Loader2 className="h-6 w-6 animate-spin text-primary" />,
  completed: <CheckCircle2 className="h-6 w-6 text-green-500" />,
  failed: <XCircle className="h-6 w-6 text-destructive" />
};

export const MinuteGenerationProgress = ({ 
  meetingId, 
  isOpen, 
  onComplete 
}: MinuteGenerationProgressProps) => {
  const [progress, setProgress] = useState<ProgressData>({
    status: 'initializing',
    progress_percentage: 0,
    current_step: null,
    estimated_completion_seconds: null,
    error_message: null
  });

  useEffect(() => {
    if (!isOpen || !meetingId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`minute-progress-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'minute_generation_progress',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          console.log('Progress update:', payload);
          const newData = payload.new as ProgressData;
          setProgress(newData);

          // Auto-close on completion or failure with audio feedback
          if (newData.status === 'completed') {
            playSuccessSound();
            setTimeout(() => {
              onComplete();
            }, 2000);
          } else if (newData.status === 'failed') {
            playErrorSound();
          }
        }
      )
      .subscribe();

    // Fetch initial progress
    const fetchProgress = async () => {
      const { data } = await supabase
        .from('minute_generation_progress')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setProgress(data);
        if (data.status === 'completed') {
          playSuccessSound();
          setTimeout(() => {
            onComplete();
          }, 2000);
        } else if (data.status === 'failed') {
          playErrorSound();
        }
      }
    };

    fetchProgress();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, isOpen, onComplete]);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `~${seconds}s`;
    const mins = Math.ceil(seconds / 60);
    return `~${mins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {statusIcons[progress.status]}
            Generating Meeting Minutes
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {statusMessages[progress.status] || progress.status}
              </span>
              <span className="font-medium">
                {progress.progress_percentage}%
              </span>
            </div>
            <Progress value={progress.progress_percentage} className="h-2" />
          </div>

          {progress.current_step && (
            <div className="text-sm text-muted-foreground">
              <p>{progress.current_step}</p>
            </div>
          )}

          {progress.estimated_completion_seconds !== null && progress.status !== 'completed' && progress.status !== 'failed' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated time: {formatTime(progress.estimated_completion_seconds)}</span>
            </div>
          )}

          {progress.error_message && (
            <div className="text-sm text-destructive">
              <p>Error: {progress.error_message}</p>
            </div>
          )}

          {progress.status === 'completed' && (
            <div className="text-sm text-green-600">
              <p>✓ Minutes have been generated and saved successfully!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
