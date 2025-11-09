import { Check, Clock, AlertCircle, FileText, FileSignature, Mail, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  
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
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-background">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-5 w-5 text-primary" />
            </motion.div>
            Workflow Progress
          </CardTitle>
          <Badge 
            variant={getStatusBadge(stages.find(s => s.status === 'in-progress')?.status || 'pending') as any}
            className={isEthioTelecom ? 'bg-[#0072BC] text-white hover:bg-[#005A9C]' : ''}
          >
            {stages.find(s => s.status === 'in-progress')?.label || 'Ready'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">

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
                const isActive = stage.status === 'in-progress';
                const isComplete = stage.status === 'completed';
                
                return (
                  <motion.div 
                    key={stage.key} 
                    className="relative flex items-start gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Icon Circle */}
                    <motion.div 
                      className={cn(
                        "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                        getStatusColor(stage.status),
                        isActive && "shadow-lg shadow-primary/50"
                      )}
                      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {isComplete ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          <Icon className="h-5 w-5" />
                        </motion.div>
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </motion.div>

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
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Overall Progress */}
          <motion.div 
            className="mt-6 pt-4 border-t"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <motion.span 
                className="font-medium"
                key={stages.filter(s => s.status === 'completed').length}
                initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
                animate={{ scale: 1, color: "hsl(var(--foreground))" }}
              >
                {Math.round((stages.filter(s => s.status === 'completed').length / stages.length) * 100)}%
              </motion.span>
            </div>
            <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(stages.filter(s => s.status === 'completed').length / stages.length) * 100}%` 
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}