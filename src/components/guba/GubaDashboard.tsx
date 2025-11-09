import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Users, Target, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  highPriorityTasks: number;
  overdueTasks: number;
  departmentBreakdown: Array<{ department: string; count: number }>;
  completionRate: number;
}

export const GubaDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userRole, setUserRole] = useState<'executive' | 'manager' | 'team'>('team');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine user's role level
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role_id, roles(name)')
        .eq('user_id', user.id);

      const roleNames = userRoles?.map(ur => (ur.roles as any)?.name) || [];
      
      if (roleNames.includes('CEO') || roleNames.includes('Admin')) {
        setUserRole('executive');
      } else if (roleNames.includes('Manager') || roleNames.includes('Chief of Staff')) {
        setUserRole('manager');
      } else {
        setUserRole('team');
      }

      // Fetch action items based on role
      let query = supabase.from('action_items').select('*');
      
      if (userRole === 'team') {
        // Team members see only their assigned tasks
        query = query.eq('assigned_to', user.id);
      }
      // Executives and managers see all tasks

      const { data: actions, error } = await query;
      if (error) throw error;

      // Calculate statistics
      const totalTasks = actions?.length || 0;
      const completedTasks = actions?.filter(a => a.status === 'completed').length || 0;
      const inProgressTasks = actions?.filter(a => a.status === 'in_progress').length || 0;
      const pendingTasks = actions?.filter(a => a.status === 'pending').length || 0;
      const highPriorityTasks = actions?.filter(a => a.priority === 'high').length || 0;
      const overdueTasks = actions?.filter(a => 
        a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
      ).length || 0;

      // Department breakdown
      const { data: departments } = await supabase.from('departments').select('*');
      const deptCounts = departments?.map(dept => ({
        department: dept.name,
        count: actions?.filter(a => a.department_id === dept.id).length || 0
      })) || [];

      setStats({
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        highPriorityTasks,
        overdueTasks,
        departmentBreakdown: deptCounts,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getDashboardTitle = () => {
    switch (userRole) {
      case 'executive':
        return 'Executive Dashboard';
      case 'manager':
        return 'Manager Dashboard';
      default:
        return 'Team Dashboard';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Ethio Telecom Branded */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 p-8 border-0 shadow-xl backdrop-blur-xl">
        <div className="absolute inset-0 bg-grid-white/5 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 animate-pulse" />
        <div className="relative">
          <h2 className="text-4xl font-bold font-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            {getDashboardTitle()}
          </h2>
          <p className="text-muted-foreground">
            {userRole === 'executive' && 'Organization-wide task overview and strategic insights 🇪🇹'}
            {userRole === 'manager' && 'Department-level coordination and task management'}
            {userRole === 'team' && 'Your personal tasks and deliverables'}
          </p>
        </div>
      </div>

      {/* Key Metrics - Enhanced with Glassmorphism */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 glass backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl font-display">{stats.totalTasks}</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              All active assignments
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 glass backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-success to-success/80 shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <CardDescription>Completion Rate</CardDescription>
            <CardTitle className="text-3xl font-display">{stats.completionRate}%</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <Progress value={stats.completionRate} className="h-2" />
          </CardContent>
        </Card>

        <Card className="border-0 glass backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive to-warning shadow-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-3xl font-display text-destructive">{stats.highPriorityTasks}</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Requires immediate attention
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 glass backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-warning to-warning/80 shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-3xl font-display text-warning">{stats.overdueTasks}</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Past due date
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Task Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <Badge variant="outline">{stats.pendingTasks}</Badge>
            </div>
            <Progress value={(stats.pendingTasks / stats.totalTasks) * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">In Progress</span>
              </div>
              <Badge variant="outline">{stats.inProgressTasks}</Badge>
            </div>
            <Progress value={(stats.inProgressTasks / stats.totalTasks) * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <Badge variant="outline">{stats.completedTasks}</Badge>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Department Breakdown (Executive & Manager only) */}
      {(userRole === 'executive' || userRole === 'manager') && (
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Task allocation across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.departmentBreakdown
                .filter(d => d.count > 0)
                .sort((a, b) => b.count - a.count)
                .map(dept => (
                  <div key={dept.department} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{dept.department}</span>
                    </div>
                    <Badge variant="secondary">{dept.count} tasks</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
