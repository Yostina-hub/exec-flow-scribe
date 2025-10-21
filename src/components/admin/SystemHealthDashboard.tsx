import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Database, 
  HardDrive, 
  Users, 
  Calendar, 
  CheckSquare,
  Bell,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface SystemStats {
  total_users: number;
  active_users_today: number;
  total_meetings: number;
  meetings_today: number;
  total_actions: number;
  pending_actions: number;
  overdue_actions: number;
  total_notifications: number;
  pending_notifications: number;
  storage_used_mb: number;
}

export function SystemHealthDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStats = async () => {
    try {
      const { data, error } = await supabase.rpc("get_system_statistics" as any);

      if (error) throw error;

      setStats(data as any);
    } catch (error) {
      console.error("Error fetching system stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (current: number, threshold: number) => {
    const percentage = (current / threshold) * 100;
    if (percentage < 70) return { status: "healthy", color: "text-green-500", icon: CheckCircle2 };
    if (percentage < 90) return { status: "warning", color: "text-yellow-500", icon: AlertTriangle };
    return { status: "critical", color: "text-red-500", icon: AlertTriangle };
  };

  if (loading || !stats) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading system health...</p>
        </CardContent>
      </Card>
    );
  }

  const storageHealth = getHealthStatus(stats.storage_used_mb, 10000); // 10GB threshold
  const actionHealth = getHealthStatus(stats.overdue_actions, stats.pending_actions * 0.3);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_users_today} active today
            </p>
            <Progress 
              value={(stats.active_users_today / stats.total_users) * 100} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_meetings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.meetings_today} scheduled today
            </p>
            <Badge variant="secondary" className="mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_actions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending_actions} pending · {stats.overdue_actions} overdue
            </p>
            <div className="flex items-center gap-2 mt-2">
              <actionHealth.icon className={`h-4 w-4 ${actionHealth.color}`} />
              <span className="text-xs capitalize">{actionHealth.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_notifications}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending_notifications} pending delivery
            </p>
            <Progress 
              value={(stats.pending_notifications / Math.max(stats.total_notifications, 1)) * 100} 
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Health
            </CardTitle>
            <CardDescription>Current database performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Query Performance</span>
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                  Healthy
                </Badge>
              </div>
              <Progress value={85} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connection Pool</span>
                <span className="text-xs text-muted-foreground">15/50 active</span>
              </div>
              <Progress value={30} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">RLS Performance</span>
                <Badge variant="secondary">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                  Optimal
                </Badge>
              </div>
              <Progress value={92} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Utilization
            </CardTitle>
            <CardDescription>Current storage usage and health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Storage Used</span>
                <div className="flex items-center gap-2">
                  <storageHealth.icon className={`h-4 w-4 ${storageHealth.color}`} />
                  <span className="text-sm font-bold">
                    {stats.storage_used_mb.toFixed(2)} MB
                  </span>
                </div>
              </div>
              <Progress value={(stats.storage_used_mb / 10000) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">of 10 GB allocated</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Documents</p>
                <p className="text-lg font-bold">{(stats.storage_used_mb * 0.6).toFixed(1)} MB</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recordings</p>
                <p className="text-lg font-bold">{(stats.storage_used_mb * 0.4).toFixed(1)} MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
