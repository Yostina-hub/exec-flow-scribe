import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Loader2,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TaskStats {
  totalAiTasks: number;
  pendingAiTasks: number;
  avgConfidence: number;
  recentProposals: any[];
  departmentStats: Array<{ name: string; count: number }>;
}

export const GubaSidebar = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskStats | null>(null);

  useEffect(() => {
    fetchStats();
    
    // Real-time updates
    const channel = supabase
      .channel('guba-stats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guba_task_proposals'
      }, () => {
        fetchStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'action_items'
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch AI-generated tasks
      const { data: aiTasks } = await supabase
        .from('action_items')
        .select('*, department:departments(name)')
        .eq('ai_generated', true);

      const totalAiTasks = aiTasks?.length || 0;
      const pendingAiTasks = aiTasks?.filter(t => t.status === 'pending').length || 0;
      const avgConfidence = aiTasks?.reduce((acc, t) => acc + (t.confidence_score || 0), 0) / totalAiTasks || 0;

      // Department breakdown
      const deptCounts = new Map<string, number>();
      aiTasks?.forEach(task => {
        const deptName = (task.department as any)?.name || 'Unassigned';
        deptCounts.set(deptName, (deptCounts.get(deptName) || 0) + 1);
      });
      const departmentStats = Array.from(deptCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recent proposals
      const { data: proposals } = await supabase
        .from('guba_task_proposals')
        .select('*, meeting:meetings(title)')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalAiTasks,
        pendingAiTasks,
        avgConfidence: Math.round(avgConfidence * 100),
        recentProposals: proposals || [],
        departmentStats
      });
    } catch (error) {
      console.error('Error fetching Guba stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="w-80 border-l bg-gradient-to-b from-purple-50/50 via-background to-pink-50/50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Guba AI</h3>
                <p className="text-xs text-muted-foreground">Task Intelligence</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-2">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-2xl font-bold">{stats.totalAiTasks}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  AI Tasks
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-2xl font-bold">{stats.pendingAiTasks}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Pending
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Confidence Score */}
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                AI Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.avgConfidence}%</span>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    High
                  </Badge>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: `${stats.avgConfidence}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          {stats.departmentStats.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Top Departments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.departmentStats.map((dept, i) => (
                  <div key={dept.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-6 rounded-full ${
                        i === 0 ? 'bg-purple-500' : 
                        i === 1 ? 'bg-pink-500' : 
                        'bg-muted'
                      }`} />
                      <span className="text-sm">{dept.name}</span>
                    </div>
                    <Badge variant="outline">{dept.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Proposals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Recent Proposals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.recentProposals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No proposals yet
                </p>
              ) : (
                stats.recentProposals.map((proposal) => (
                  <div 
                    key={proposal.id}
                    className="p-2 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/actions')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {(proposal.meeting as any)?.title || 'Unknown Meeting'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={proposal.status === 'pending' ? 'outline' : 
                                   proposal.status === 'accepted' ? 'success' : 'secondary'}
                            className="text-xs"
                          >
                            {proposal.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(proposal.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Action Button */}
          <Button 
            className="w-full gap-2" 
            onClick={() => navigate('/actions')}
          >
            <Sparkles className="h-4 w-4" />
            View All Tasks
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
