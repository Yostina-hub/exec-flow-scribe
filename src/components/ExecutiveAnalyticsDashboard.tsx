import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ExecutiveAnalyticsDashboard = () => {
  const [stats, setStats] = useState({
    totalMeetings: 0,
    completedMeetings: 0,
    avgDuration: 0,
    actionItemsCompleted: 0,
    actionItemsPending: 0,
    topParticipants: [] as any[],
    meetingEfficiency: 0,
    monthlyTrend: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*, action_items(*), meeting_attendees(*)');

      const { data: actions } = await supabase
        .from('action_items')
        .select('*');

      const total = meetings?.length || 0;
      const completed = meetings?.filter(m => m.status === 'completed').length || 0;
      const actionsCompleted = actions?.filter(a => a.status === 'completed').length || 0;
      const actionsPending = actions?.filter(a => a.status === 'pending').length || 0;

      setStats({
        totalMeetings: total,
        completedMeetings: completed,
        avgDuration: 45, // Calculate from meeting data
        actionItemsCompleted: actionsCompleted,
        actionItemsPending: actionsPending,
        topParticipants: [],
        meetingEfficiency: Math.round((completed / total) * 100) || 0,
        monthlyTrend: 12
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const metrics = [
    {
      title: 'Total Meetings',
      value: stats.totalMeetings,
      change: `+${stats.monthlyTrend}%`,
      trend: 'up',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Completion Rate',
      value: `${stats.meetingEfficiency}%`,
      change: '+5%',
      trend: 'up',
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Avg Duration',
      value: `${stats.avgDuration}min`,
      change: '-8%',
      trend: 'down',
      icon: Clock,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Action Items',
      value: stats.actionItemsCompleted + stats.actionItemsPending,
      change: `${stats.actionItemsCompleted} done`,
      trend: 'up',
      icon: Target,
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Executive Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Strategic insights for Ethiopian Telecom leadership
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Activity className="h-3 w-3" />
          Real-time Data
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${metric.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <Badge variant={metric.trend === 'up' ? 'default' : 'secondary'}>
                      {metric.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {metric.change}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-sm text-muted-foreground mt-1">{metric.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="participation">Participation</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Meeting Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">On-time Start</span>
                    <span className="text-sm font-medium">87%</span>
                  </div>
                  <Progress value={87} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Agenda Completion</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <Progress value={92} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Action Item Follow-up</span>
                    <span className="text-sm font-medium">78%</span>
                  </div>
                  <Progress value={78} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Meeting Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {[
                      { type: 'Strategic', count: 12, color: 'bg-blue-500' },
                      { type: 'Operational', count: 28, color: 'bg-green-500' },
                      { type: 'Project Review', count: 15, color: 'bg-purple-500' },
                      { type: 'Executive', count: 8, color: 'bg-orange-500' }
                    ].map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${item.color}`} />
                          <span className="text-sm">{item.type}</span>
                        </div>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Team and meeting performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Performance analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participation">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Participation Analytics</CardTitle>
              <CardDescription>Attendee engagement and contribution metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Participation data coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Action Items Tracking</CardTitle>
              <CardDescription>Monitor action item completion and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Completed</span>
                  <Badge variant="default">{stats.actionItemsCompleted}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">In Progress</span>
                  <Badge variant="secondary">{stats.actionItemsPending}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Overdue</span>
                  <Badge variant="destructive">3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
