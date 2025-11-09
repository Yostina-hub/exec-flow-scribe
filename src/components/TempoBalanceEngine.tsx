import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Clock, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface TempoBalanceEngineProps {
  meetingId: string;
  meetingDuration: number;
  agendaItems: number;
  currentProgress: number;
}

interface TempoMetrics {
  pace: 'too-slow' | 'optimal' | 'too-fast';
  timePerAgendaItem: number;
  projectedOverrun: number;
  efficiencyScore: number;
  recommendation: string;
}

export function TempoBalanceEngine({ 
  meetingId, 
  meetingDuration, 
  agendaItems,
  currentProgress 
}: TempoBalanceEngineProps) {
  const [metrics, setMetrics] = useState<TempoMetrics>({
    pace: 'optimal',
    timePerAgendaItem: 0,
    projectedOverrun: 0,
    efficiencyScore: 87,
    recommendation: 'On track - maintain current pace'
  });

  useEffect(() => {
    calculateTempoMetrics();
    const interval = setInterval(calculateTempoMetrics, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [currentProgress]);

  const calculateTempoMetrics = () => {
    const idealTimePerItem = meetingDuration / agendaItems;
    const elapsedTime = (currentProgress / 100) * meetingDuration;
    const completedItems = Math.floor((currentProgress / 100) * agendaItems);
    const actualTimePerItem = completedItems > 0 ? elapsedTime / completedItems : 0;
    
    let pace: 'too-slow' | 'optimal' | 'too-fast' = 'optimal';
    let recommendation = 'On track - maintain current pace';
    
    if (actualTimePerItem > idealTimePerItem * 1.2) {
      pace = 'too-slow';
      recommendation = 'Consider moving to next topic or scheduling follow-up';
    } else if (actualTimePerItem < idealTimePerItem * 0.8) {
      pace = 'too-fast';
      recommendation = 'Excellent progress - consider deep dive on key items';
    }

    const remainingItems = agendaItems - completedItems;
    const remainingTime = meetingDuration - elapsedTime;
    const projectedOverrun = Math.max(0, (remainingItems * actualTimePerItem) - remainingTime);
    
    const efficiencyScore = Math.min(100, Math.round(
      (idealTimePerItem / (actualTimePerItem || 1)) * 100
    ));

    setMetrics({
      pace,
      timePerAgendaItem: actualTimePerItem,
      projectedOverrun,
      efficiencyScore,
      recommendation
    });
  };

  const getPaceConfig = () => {
    switch (metrics.pace) {
      case 'too-slow':
        return {
          color: 'warning',
          icon: TrendingDown,
          label: 'Behind Schedule',
          gradient: 'from-warning to-warning/70'
        };
      case 'too-fast':
        return {
          color: 'info',
          icon: TrendingUp,
          label: 'Ahead of Schedule',
          gradient: 'from-info to-info/70'
        };
      default:
        return {
          color: 'success',
          icon: CheckCircle2,
          label: 'Optimal Pace',
          gradient: 'from-success to-success/70'
        };
    }
  };

  const config = getPaceConfig();
  const Icon = config.icon;

  return (
    <Card className="border-l-4 border-l-primary shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Tempo Balance Engine
          </CardTitle>
          <Badge variant="outline" className={`bg-gradient-to-r ${config.gradient} text-white border-0`}>
            {metrics.efficiencyScore}% Efficient
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pace Indicator */}
        <motion.div 
          className="p-4 rounded-lg bg-gradient-to-br from-background to-muted/30 border"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full bg-gradient-to-br ${config.gradient}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Current Pace</p>
              <p className="text-lg font-bold">{config.label}</p>
            </div>
          </div>
          <Progress value={metrics.efficiencyScore} className="h-2" />
        </motion.div>

        {/* Time Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">Avg Time/Item</p>
            </div>
            <p className="text-xl font-bold">{Math.round(metrics.timePerAgendaItem)}m</p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <p className="text-xs text-muted-foreground">Projected Overrun</p>
            </div>
            <p className="text-xl font-bold">
              {metrics.projectedOverrun > 0 ? `+${Math.round(metrics.projectedOverrun)}m` : '0m'}
            </p>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs font-medium text-primary mb-1">AI Recommendation</p>
          <p className="text-sm text-foreground">{metrics.recommendation}</p>
        </div>

        {/* Rhythm Visualization */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Meeting Rhythm</p>
          <div className="flex gap-1 h-12 items-end">
            {Array.from({ length: 12 }).map((_, i) => {
              const height = 30 + Math.sin((i + currentProgress) * 0.5) * 20 + Math.random() * 15;
              const isActive = i < (currentProgress / 100) * 12;
              return (
                <motion.div
                  key={i}
                  className={`flex-1 rounded-t ${
                    isActive 
                      ? 'bg-gradient-to-t from-primary to-primary/60' 
                      : 'bg-muted/30'
                  }`}
                  style={{ height: `${height}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
