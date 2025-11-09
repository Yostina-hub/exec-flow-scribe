import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Battery, BatteryLow, BatteryMedium, BatteryFull, Brain, Coffee, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface CognitiveFatigueIndexProps {
  meetingId: string;
  meetingDuration: number;
  startTime: string;
}

interface FatigueMetrics {
  energyLevel: number;
  creativityIndex: number;
  focusScore: number;
  fatigueStatus: 'fresh' | 'engaged' | 'tiring' | 'fatigued';
  recommendation: string;
  estimatedOptimalEndTime: string;
}

export function CognitiveFatigueIndex({ 
  meetingId, 
  meetingDuration, 
  startTime 
}: CognitiveFatigueIndexProps) {
  const [metrics, setMetrics] = useState<FatigueMetrics>({
    energyLevel: 85,
    creativityIndex: 78,
    focusScore: 82,
    fatigueStatus: 'engaged',
    recommendation: 'Energy levels optimal - continue',
    estimatedOptimalEndTime: ''
  });

  useEffect(() => {
    calculateFatigueMetrics();
    const interval = setInterval(calculateFatigueMetrics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [meetingId, startTime]);

  const calculateFatigueMetrics = async () => {
    try {
      const meetingStart = new Date(startTime);
      const elapsedMinutes = (Date.now() - meetingStart.getTime()) / (1000 * 60);
      
      // Fetch transcription activity patterns
      const { data: transcripts } = await supabase
        .from('transcriptions')
        .select('content, timestamp')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      // Calculate energy based on meeting duration and participation patterns
      let energyLevel = 100;
      
      // Energy decreases over time (cognitive load)
      if (elapsedMinutes > 30) {
        energyLevel -= Math.min(40, (elapsedMinutes - 30) * 0.8);
      }
      
      // Boost energy if there's high activity recently
      const recentTranscripts = transcripts?.filter(t => {
        const tTime = new Date(t.timestamp);
        return (Date.now() - tTime.getTime()) < 5 * 60 * 1000; // Last 5 minutes
      }) || [];
      
      if (recentTranscripts.length > 10) {
        energyLevel = Math.min(100, energyLevel + 10);
      }

      // Calculate creativity index (based on message diversity and length)
      const avgMessageLength = transcripts && transcripts.length > 0
        ? transcripts.reduce((sum, t) => sum + t.content.length, 0) / transcripts.length
        : 0;
      
      let creativityIndex = Math.min(100, avgMessageLength * 0.5);
      if (elapsedMinutes > 45) {
        creativityIndex *= 0.8; // Creativity drops in longer meetings
      }

      // Calculate focus score (consistency of participation)
      const participationGaps = calculateParticipationGaps(transcripts || []);
      const focusScore = Math.max(30, 100 - (participationGaps * 10));

      // Determine fatigue status
      const avgScore = (energyLevel + creativityIndex + focusScore) / 3;
      let fatigueStatus: 'fresh' | 'engaged' | 'tiring' | 'fatigued' = 'engaged';
      let recommendation = 'Energy levels optimal - continue';

      if (avgScore >= 80) {
        fatigueStatus = 'fresh';
        recommendation = 'Peak cognitive performance - tackle complex topics';
      } else if (avgScore >= 60) {
        fatigueStatus = 'engaged';
        recommendation = 'Good engagement - maintain current pace';
      } else if (avgScore >= 40) {
        fatigueStatus = 'tiring';
        recommendation = 'Consider a short break or shift to lighter topics';
      } else {
        fatigueStatus = 'fatigued';
        recommendation = 'High fatigue detected - wrap up or take a break';
      }

      // Calculate optimal end time
      const optimalDuration = Math.max(30, 90 - (elapsedMinutes * 0.5));
      const optimalEndTime = new Date(meetingStart.getTime() + optimalDuration * 60 * 1000);

      setMetrics({
        energyLevel: Math.round(energyLevel),
        creativityIndex: Math.round(creativityIndex),
        focusScore: Math.round(focusScore),
        fatigueStatus,
        recommendation,
        estimatedOptimalEndTime: optimalEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (error) {
      console.error('Error calculating fatigue metrics:', error);
    }
  };

  const calculateParticipationGaps = (transcripts: any[]): number => {
    if (transcripts.length < 2) return 0;
    
    let gaps = 0;
    for (let i = 1; i < transcripts.length; i++) {
      const timeDiff = new Date(transcripts[i].timestamp).getTime() - 
                      new Date(transcripts[i - 1].timestamp).getTime();
      if (timeDiff > 2 * 60 * 1000) gaps++; // Gap > 2 minutes
    }
    return gaps;
  };

  const getStatusConfig = () => {
    switch (metrics.fatigueStatus) {
      case 'fresh':
        return {
          color: 'success',
          gradient: 'from-success to-emerald-600',
          icon: BatteryFull,
          label: 'Fresh & Focused',
          bgColor: 'bg-success/10'
        };
      case 'engaged':
        return {
          color: 'primary',
          gradient: 'from-primary to-primary/70',
          icon: BatteryMedium,
          label: 'Engaged',
          bgColor: 'bg-primary/10'
        };
      case 'tiring':
        return {
          color: 'warning',
          gradient: 'from-warning to-warning/70',
          icon: BatteryLow,
          label: 'Tiring',
          bgColor: 'bg-warning/10'
        };
      default:
        return {
          color: 'destructive',
          gradient: 'from-destructive to-destructive/70',
          icon: Battery,
          label: 'Fatigued',
          bgColor: 'bg-destructive/10'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;
  const avgScore = Math.round((metrics.energyLevel + metrics.creativityIndex + metrics.focusScore) / 3);

  return (
    <Card className="border-l-4 border-l-primary shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Cognitive Fatigue Index
          </CardTitle>
          <Badge variant="outline" className={`bg-gradient-to-r ${config.gradient} text-white border-0`}>
            {avgScore}% Capacity
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicator */}
        <motion.div 
          className={`p-4 rounded-lg bg-gradient-to-br ${config.bgColor} border border-${config.color}/20`}
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full bg-gradient-to-br ${config.gradient}`}>
              <StatusIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Fatigue Status</p>
              <p className="text-lg font-bold">{config.label}</p>
            </div>
          </div>
          <Progress value={avgScore} className="h-2" />
        </motion.div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 mb-1">
              <Battery className="h-3 w-3 text-primary" />
              <p className="text-[10px] text-muted-foreground">Energy</p>
            </div>
            <p className="text-xl font-bold">{metrics.energyLevel}</p>
            <Progress value={metrics.energyLevel} className="h-1 mt-1" />
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-[10px] text-muted-foreground">Creativity</p>
            </div>
            <p className="text-xl font-bold">{metrics.creativityIndex}</p>
            <Progress value={metrics.creativityIndex} className="h-1 mt-1" />
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 mb-1">
              <Brain className="h-3 w-3 text-primary" />
              <p className="text-[10px] text-muted-foreground">Focus</p>
            </div>
            <p className="text-xl font-bold">{metrics.focusScore}</p>
            <Progress value={metrics.focusScore} className="h-1 mt-1" />
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Coffee className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary">AI Recommendation</p>
          </div>
          <p className="text-sm text-foreground">{metrics.recommendation}</p>
        </div>

        {/* Optimal End Time */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
          <span className="text-muted-foreground">Optimal End Time:</span>
          <span className="font-semibold">{metrics.estimatedOptimalEndTime}</span>
        </div>

        {/* Warning if fatigue is high */}
        {metrics.fatigueStatus === 'fatigued' && (
          <motion.div 
            className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">Critical fatigue levels - consider ending meeting</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
