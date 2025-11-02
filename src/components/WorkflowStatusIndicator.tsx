import { Check, Clock, AlertCircle, FileText, FileSignature, Mail, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WorkflowStage {
  key: string;
  label: string;
  icon: any;
  status: 'completed' | 'in-progress' | 'pending' | 'failed';
}

interface WorkflowStatusIndicatorProps {
  transcriptionStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  minutesStatus: 'pending' | 'generated' | 'reviewed' | 'approved';
  pdfStatus: 'pending' | 'generated' | 'signed' | 'distributed';
  workflowStage: 'created' | 'recording' | 'transcribing' | 'minutes_ready' | 'pdf_ready' | 'awaiting_signatures' | 'completed';
}

export function WorkflowStatusIndicator({
  transcriptionStatus,
  minutesStatus,
  pdfStatus,
  workflowStage
}: WorkflowStatusIndicatorProps) {
  
  const stages: WorkflowStage[] = [
    {
      key: 'recording',
      label: 'Recording',
      icon: Clock,
      status: workflowStage === 'recording' ? 'in-progress' : 
              ['transcribing', 'minutes_ready', 'pdf_ready', 'awaiting_signatures', 'completed'].includes(workflowStage) ? 'completed' : 'pending'
    },
    {
      key: 'transcription',
      label: 'Transcription',
      icon: FileText,
      status: transcriptionStatus === 'in_progress' ? 'in-progress' :
              transcriptionStatus === 'completed' ? 'completed' :
              transcriptionStatus === 'failed' ? 'failed' : 'pending'
    },
    {
      key: 'minutes',
      label: 'Minutes Generated',
      icon: FileText,
      status: minutesStatus === 'generated' || minutesStatus === 'reviewed' || minutesStatus === 'approved' ? 'completed' :
              workflowStage === 'minutes_ready' ? 'in-progress' : 'pending'
    },
    {
      key: 'pdf',
      label: 'PDF Created',
      icon: FileText,
      status: pdfStatus === 'generated' || pdfStatus === 'signed' || pdfStatus === 'distributed' ? 'completed' :
              workflowStage === 'pdf_ready' ? 'in-progress' : 'pending'
    },
    {
      key: 'signatures',
      label: 'Sign-Off',
      icon: FileSignature,
      status: pdfStatus === 'signed' || pdfStatus === 'distributed' ? 'completed' :
              workflowStage === 'awaiting_signatures' ? 'in-progress' : 'pending'
    },
    {
      key: 'distribution',
      label: 'Distributed',
      icon: Mail,
      status: pdfStatus === 'distributed' || workflowStage === 'completed' ? 'completed' : 'pending'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-success" />;
      case 'in-progress':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 border-success';
      case 'in-progress':
        return 'bg-primary/20 border-primary animate-pulse';
      case 'failed':
        return 'bg-destructive/20 border-destructive';
      default:
        return 'bg-muted border-muted-foreground/20';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Workflow Progress</h3>
            <Badge variant={getStatusBadge(stages.find(s => s.status === 'in-progress')?.status || 'pending') as any}>
              {stages.find(s => s.status === 'in-progress')?.label || 'Ready'}
            </Badge>
          </div>

          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-6 h-[calc(100%-3rem)] w-0.5 bg-muted" />
            <div 
              className="absolute top-6 left-6 w-0.5 bg-primary transition-all duration-500"
              style={{ 
                height: `${(stages.filter(s => s.status === 'completed').length / stages.length) * 100}%` 
              }}
            />

            {/* Stages */}
            <div className="space-y-6">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <div key={stage.key} className="relative flex items-start gap-4">
                    {/* Icon Circle */}
                    <div className={cn(
                      "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                      getStatusColor(stage.status)
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{stage.label}</h4>
                        {getStatusIcon(stage.status)}
                      </div>
                      {stage.status === 'failed' && (
                        <p className="text-sm text-destructive mt-1">
                          Failed - Please retry
                        </p>
                      )}
                      {stage.status === 'in-progress' && (
                        <p className="text-sm text-primary mt-1">
                          In progress...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">
                {Math.round((stages.filter(s => s.status === 'completed').length / stages.length) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ 
                  width: `${(stages.filter(s => s.status === 'completed').length / stages.length) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}