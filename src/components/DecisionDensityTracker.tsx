import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Target, TrendingUp, CheckCircle2, AlertCircle, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface DecisionDensityTrackerProps {
  meetingId: string;
  meetingDuration: number;
  startTime: string;
}

interface DecisionMetrics {
  totalDecisions: number;
  decisionsPerHour: number;
  clarityIndex: number;
  momentumCurve: number;
  decisionQuality: 'excellent' | 'good' | 'needs-improvement';
  recentDecisions: Array<{
    id: string;
    title: string;
    timestamp: string;
    category: string;
  }>;
}

export function DecisionDensityTracker({ 
  meetingId, 
  meetingDuration, 
  startTime 
}: DecisionDensityTrackerProps) {
  const [metrics, setMetrics] = useState<DecisionMetrics>({
    totalDecisions: 0,
    decisionsPerHour: 0,
    clarityIndex: 0,
    momentumCurve: 0,
    decisionQuality: 'good',
    recentDecisions: []
  });

  useEffect(() => {
    fetchDecisionMetrics();
    const interval = setInterval(fetchDecisionMetrics, 45000); // Update every 45s
    
    // Subscribe to new decisions
    const channel = supabase
      .channel(`decisions-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'decisions',
          filter: `meeting_id=eq.${meetingId}`
        },
        () => fetchDecisionMetrics()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchDecisionMetrics = async () => {
    try {
      const { data: decisions } = await supabase
        .from('decisions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (!decisions) return;

      const totalDecisions = decisions.length;
      const meetingStart = new Date(startTime);
      const elapsedHours = (Date.now() - meetingStart.getTime()) / (1000 * 60 * 60);
      const decisionsPerHour = elapsedHours > 0 ? totalDecisions / elapsedHours : 0;

      // Calculate clarity index (based on decision_text length and status)
      const avgDescriptionLength = decisions.length > 0
        ? decisions.reduce((sum, d) => sum + (d.decision_text?.length || 0), 0) / decisions.length
        : 0;
      const approvedCount = decisions.filter(d => d.status === 'approved').length;
      const clarityIndex = Math.min(100, Math.round(
        (avgDescriptionLength / 2) + (approvedCount / Math.max(1, decisions.length)) * 50
      ));

      // Calculate momentum curve (decisions over time)
      const recentCount = decisions.filter(d => {
        const decisionTime = new Date(d.created_at);
        const minutesAgo = (Date.now() - decisionTime.getTime()) / (1000 * 60);
        return minutesAgo <= 30;
      }).length;
      const momentumCurve = Math.min(100, recentCount * 20);

      // Determine decision quality
      let decisionQuality: 'excellent' | 'good' | 'needs-improvement' = 'good';
      if (decisionsPerHour >= 3 && clarityIndex >= 80) {
        decisionQuality = 'excellent';
      } else if (decisionsPerHour < 1 || clarityIndex < 50) {
        decisionQuality = 'needs-improvement';
      }

      const recentDecisions = decisions.slice(0, 5).map(d => ({
        id: d.id,
        title: d.decision_text,
        timestamp: d.created_at,
        category: d.context || 'general'
      }));

      setMetrics({
        totalDecisions,
        decisionsPerHour,
        clarityIndex,
        momentumCurve,
        decisionQuality,
        recentDecisions
      });
    } catch (error) {
      console.error('Error fetching decision metrics:', error);
    }
  };

  const getQualityConfig = () => {
    switch (metrics.decisionQuality) {
      case 'excellent':
        return {
          color: 'success',
          gradient: 'from-success to-emerald-600',
          label: 'Excellent',
          icon: CheckCircle2,
          message: 'Outstanding decision velocity and clarity'
        };
      case 'needs-improvement':
        return {
          color: 'warning',
          gradient: 'from-warning to-warning/70',
          label: 'Needs Focus',
          icon: AlertCircle,
          message: 'Consider accelerating decision-making'
        };
      default:
        return {
          color: 'primary',
          gradient: 'from-primary to-primary/70',
          label: 'Good Progress',
          icon: TrendingUp,
          message: 'Steady decision-making pace'
        };
    }
  };

  const qualityConfig = getQualityConfig();
  const QualityIcon = qualityConfig.icon;

  return (
    <Card className="border-l-4 border-l-primary shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Decision Density Tracker
          </CardTitle>
          <Badge variant="outline" className={`bg-gradient-to-r ${qualityConfig.gradient} text-white border-0`}>
            {qualityConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Decisions/Hour</p>
            </div>
            <p className="text-3xl font-bold text-primary">{metrics.decisionsPerHour.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.totalDecisions} total</p>
          </motion.div>

          <motion.div 
            className="p-4 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <p className="text-xs font-medium text-muted-foreground">Clarity Index</p>
            </div>
            <p className="text-3xl font-bold text-success">{metrics.clarityIndex}</p>
            <Progress value={metrics.clarityIndex} className="h-1.5 mt-2" />
          </motion.div>
        </div>

        {/* Momentum Curve */}
        <div className="p-3 rounded-lg bg-muted/30 border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Decision Momentum</p>
            <span className="text-xs text-muted-foreground">Last 30 min</span>
          </div>
          <div className="flex gap-1 h-16 items-end">
            {Array.from({ length: 10 }).map((_, i) => {
              const height = 20 + (i <= (metrics.momentumCurve / 10) ? Math.random() * 60 : Math.random() * 20);
              return (
                <motion.div
                  key={i}
                  className={`flex-1 rounded-t ${
                    i <= (metrics.momentumCurve / 10)
                      ? 'bg-gradient-to-t from-primary to-primary/60'
                      : 'bg-muted'
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

        {/* Quality Assessment */}
        <div className={`p-3 rounded-lg bg-gradient-to-br from-${qualityConfig.color}/5 to-${qualityConfig.color}/10 border border-${qualityConfig.color}/20`}>
          <div className="flex items-center gap-2 mb-1">
            <QualityIcon className={`h-4 w-4 text-${qualityConfig.color}`} />
            <p className="text-sm font-semibold text-foreground">AI Assessment</p>
          </div>
          <p className="text-xs text-muted-foreground">{qualityConfig.message}</p>
        </div>

        {/* Recent Decisions */}
        {metrics.recentDecisions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Decisions</p>
            <div className="space-y-1.5">
              {metrics.recentDecisions.slice(0, 3).map((decision, index) => (
                <motion.div
                  key={decision.id}
                  className="p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium truncate flex-1">{decision.title}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-2">
                      {decision.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(decision.timestamp).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
