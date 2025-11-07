import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Brain, Target, CheckCircle2, XCircle } from "lucide-react";

interface LearningMetrics {
  overall_acceptance_rate: number;
  total_proposals: number;
  accepted_proposals: number;
  rejected_proposals: number;
  priority_performance: {
    high: { total: number; accepted: number; rate: number };
    medium: { total: number; accepted: number; rate: number };
    low: { total: number; accepted: number; rate: number };
  };
  improvement_trend: number; // Percentage improvement over previous period
}

export const GubaLearningAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);

  useEffect(() => {
    fetchLearningMetrics();

    // Real-time updates
    const channel = supabase
      .channel('guba-learning-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guba_feedback' }, fetchLearningMetrics)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLearningMetrics = async () => {
    try {
      // Get recent feedback data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: feedback, error } = await supabase
        .from('guba_feedback')
        .select(`
          *,
          proposal:guba_task_proposals(generated_tasks)
        `)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Calculate metrics
      const total = feedback?.length || 0;
      const accepted = feedback?.filter(f => f.accepted).length || 0;
      const rejected = total - accepted;
      const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0;

      // Priority performance
      const priorityStats: any = {
        high: { total: 0, accepted: 0, rate: 0 },
        medium: { total: 0, accepted: 0, rate: 0 },
        low: { total: 0, accepted: 0, rate: 0 },
      };

      feedback?.forEach((f: any) => {
        const tasks = f.proposal?.generated_tasks?.tasks || [];
        const task = tasks.find((t: any) => t.id === f.task_id);
        if (task?.priority) {
          priorityStats[task.priority].total++;
          if (f.accepted) {
            priorityStats[task.priority].accepted++;
          }
        }
      });

      // Calculate rates
      Object.keys(priorityStats).forEach((priority) => {
        const stat = priorityStats[priority];
        stat.rate = stat.total > 0 ? (stat.accepted / stat.total) * 100 : 0;
      });

      // Get previous period for trend
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: previousFeedback } = await supabase
        .from('guba_feedback')
        .select('accepted')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      const prevTotal = previousFeedback?.length || 0;
      const prevAccepted = previousFeedback?.filter(f => f.accepted).length || 0;
      const prevRate = prevTotal > 0 ? (prevAccepted / prevTotal) * 100 : 0;
      const improvement = prevRate > 0 ? ((acceptanceRate - prevRate) / prevRate) * 100 : 0;

      setMetrics({
        overall_acceptance_rate: acceptanceRate,
        total_proposals: total,
        accepted_proposals: accepted,
        rejected_proposals: rejected,
        priority_performance: priorityStats,
        improvement_trend: improvement,
      });
    } catch (error) {
      console.error('Error fetching learning metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No learning data available yet. Start accepting or rejecting task proposals to train the AI.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-500/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Learning Analytics
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Smart
              </Badge>
            </CardTitle>
            <CardDescription>
              System performance and improvement over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Performance */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Acceptance Rate</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    {metrics.overall_acceptance_rate.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              {metrics.improvement_trend !== 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <TrendingUp className={`h-3 w-3 ${metrics.improvement_trend > 0 ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={metrics.improvement_trend > 0 ? 'text-green-600' : 'text-red-600'}>
                    {metrics.improvement_trend > 0 ? '+' : ''}{metrics.improvement_trend.toFixed(1)}% vs last month
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Proposals</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                    {metrics.total_proposals}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {metrics.accepted_proposals} accepted, {metrics.rejected_proposals} rejected
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Learning Status</p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                    {metrics.total_proposals > 20 ? 'Active' : 'Training'}
                  </p>
                </div>
                <Brain className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {metrics.total_proposals < 20 ? `${20 - metrics.total_proposals} more needed` : 'Fully trained'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Performance */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Performance by Priority</h4>
          
          {(['high', 'medium', 'low'] as const).map((priority) => {
            const stat = metrics.priority_performance[priority];
            return (
              <div key={priority} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'warning' : 'secondary'}
                      className="capitalize"
                    >
                      {priority}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {stat.accepted}/{stat.total} accepted
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {stat.rate.toFixed(0)}%
                  </span>
                </div>
                <Progress value={stat.rate} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* Training Progress */}
        {metrics.total_proposals < 20 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 p-4">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  AI Training in Progress
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  The system needs at least 20 feedback samples to optimize recommendations. 
                  Continue accepting or rejecting task proposals to improve accuracy.
                </p>
                <Progress 
                  value={(metrics.total_proposals / 20) * 100} 
                  className="mt-3 h-2"
                />
              </div>
            </div>
          </div>
        )}

        {metrics.total_proposals >= 20 && (
          <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  AI Fully Trained
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  The system has learned your preferences and will continue improving with each interaction.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
