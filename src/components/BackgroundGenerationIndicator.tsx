import { useMinuteGeneration } from '@/contexts/MinuteGenerationContext';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const BackgroundGenerationIndicator = () => {
  const { activeGenerations } = useMinuteGeneration();
  const navigate = useNavigate();

  // Only show in-progress generations
  const inProgress = activeGenerations.filter(
    g => !['completed', 'failed'].includes(g.status)
  );

  if (inProgress.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {inProgress.map(gen => (
        <Card 
          key={gen.meetingId} 
          className="p-4 shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigate(`/meetings/${gen.meetingId}`)}
        >
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {gen.meetingTitle}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{gen.currentStep || 'Generating...'}</span>
                  <span className="font-medium">{gen.progress}%</span>
                </div>
                <Progress value={gen.progress} className="h-1.5" />
                {gen.estimatedSeconds !== null && gen.estimatedSeconds > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ~{gen.estimatedSeconds < 60 ? `${gen.estimatedSeconds}s` : `${Math.ceil(gen.estimatedSeconds / 60)}m`} remaining
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
