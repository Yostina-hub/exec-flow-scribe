import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CheckSquare, 
  Users,
  BarChart3,
  Clock,
  Target,
  Award
} from "lucide-react";
import { format, subDays } from "date-fns";

interface MeetingAnalytics {
  total_meetings: number;
  completed_meetings: number;
  average_duration_minutes: number;
  average_attendance_rate: number;
  total_participants: number;
  meetings_by_status: Record<string, number>;
}

interface ActionAnalytics {
  total_actions: number;
  completed_actions: number;
  completion_rate: number;
  overdue_actions: number;
  average_completion_time_days: number;
  actions_by_priority: Record<string, number>;
  actions_by_status: Record<string, number>;
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [meetingAnalytics, setMeetingAnalytics] = useState<MeetingAnalytics | null>(null);
  const [actionAnalytics, setActionAnalytics] = useState<ActionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const [meetingRes, actionRes] = await Promise.all([
        supabase.rpc("get_meeting_analytics" as any, {
          _start_date: startDate,
          _end_date: endDate,
        }),
        supabase.rpc("get_action_analytics" as any, {
          _start_date: startDate,
          _end_date: endDate,
        }),
      ]);

      if (meetingRes.error) throw meetingRes.error;
      if (actionRes.error) throw actionRes.error;

      setMeetingAnalytics(meetingRes.data as any);
      setActionAnalytics(actionRes.data as any);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (value: number, threshold: number) => {
    if (value >= threshold) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  if (loading || !meetingAnalytics || !actionAnalytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = meetingAnalytics.total_meetings > 0
    ? (meetingAnalytics.completed_meetings / meetingAnalytics.total_meetings) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights and performance metrics
          </p>
        </div>
        <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{meetingAnalytics.total_meetings}</div>
                <div className="flex items-center gap-2 mt-2">
                  {getTrendIcon(completionRate, 75)}
                  <span className="text-xs text-muted-foreground">
                    {completionRate.toFixed(1)}% completed
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Action Items</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{actionAnalytics.total_actions}</div>
                <div className="flex items-center gap-2 mt-2">
                  {getTrendIcon(actionAnalytics.completion_rate, 70)}
                  <span className="text-xs text-muted-foreground">
                    {actionAnalytics.completion_rate.toFixed(1)}% completion
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {meetingAnalytics.average_attendance_rate?.toFixed(1) || '0'}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {meetingAnalytics.total_participants} participants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {meetingAnalytics.average_duration_minutes?.toFixed(0) || '0'}m
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  per meeting
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Performance</CardTitle>
                <CardDescription>Status breakdown and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(meetingAnalytics.meetings_by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{status}</Badge>
                      </div>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Action Item Insights</CardTitle>
                <CardDescription>Priority and status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">By Priority</p>
                    {Object.entries(actionAnalytics.actions_by_priority || {}).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between mb-2">
                        <Badge 
                          variant={priority === 'urgent' || priority === 'high' ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {priority}
                        </Badge>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                  {actionAnalytics.overdue_actions > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-500">Overdue Actions</span>
                        <span className="text-xl font-bold text-red-500">
                          {actionAnalytics.overdue_actions}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{completionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {meetingAnalytics.completed_meetings} of {meetingAnalytics.total_meetings} meetings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {meetingAnalytics.average_duration_minutes?.toFixed(0) || '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">minutes per meeting</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {meetingAnalytics.total_participants}
                </div>
                <p className="text-xs text-muted-foreground mt-1">unique participants</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {actionAnalytics.completion_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {actionAnalytics.completed_actions} of {actionAnalytics.total_actions} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Completion Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {actionAnalytics.average_completion_time_days?.toFixed(1) || '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">days to complete</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Overdue Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">
                  {actionAnalytics.overdue_actions}
                </div>
                <p className="text-xs text-muted-foreground mt-1">require attention</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
