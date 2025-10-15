import { Layout } from "@/components/Layout";
import { SmartDashboardCard } from "@/components/SmartDashboardCard";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { 
  Calendar, Play, FileText, TrendingUp, Clock, 
  Users, Zap, Target, CheckSquare, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow } from "date-fns";

export default function Index() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: meetingsData } = await supabase
        .from("meetings")
        .select("*")
        .eq("status", "scheduled")
        .order("start_time", { ascending: true })
        .limit(3);

      const { data: actionsData } = await supabase
        .from("action_items")
        .select("*")
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true})
        .limit(3);

      // Enrich actions with related data
      const enrichedActions = await Promise.all((actionsData || []).map(async (action) => {
        const [assignee, meeting] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", action.assigned_to).maybeSingle(),
          action.meeting_id 
            ? supabase.from("meetings").select("title").eq("id", action.meeting_id).maybeSingle()
            : Promise.resolve({ data: null })
        ]);
        
        return {
          ...action,
          assignee: assignee.data,
          meeting: meeting.data
        };
      }));

      setMeetings(meetingsData || []);
      setActions(enrichedActions);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatMeetingDate = (start: string) => {
    const date = new Date(start);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  const todayMeetingsCount = meetings.filter(m => isToday(new Date(m.start_time))).length;
  const pendingActionsCount = actions.length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 animate-fade-in">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Welcome Back! 👋</h1>
            <p className="text-lg text-muted-foreground">
              You have {todayMeetingsCount} meeting{todayMeetingsCount !== 1 ? 's' : ''} today and {pendingActionsCount} pending action{pendingActionsCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {/* Smart Quick Action Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SmartDashboardCard
            title="Today's Meetings"
            description={`${todayMeetingsCount} meeting${todayMeetingsCount !== 1 ? 's' : ''} scheduled`}
            icon={Calendar}
            gradient="from-blue-500/10 to-blue-500/5"
            stats={[
              { label: "Next meeting", value: meetings[0] ? format(new Date(meetings[0].start_time), "h:mm a") : "None" },
              { label: "Total today", value: todayMeetingsCount.toString() },
            ]}
            actions={[
              { 
                label: "View All", 
                onClick: () => navigate('/meetings'),
                variant: 'outline',
                icon: Calendar,
              },
            ]}
          />

          <SmartDashboardCard
            title="Action Items"
            description={`${pendingActionsCount} items pending`}
            icon={Target}
            gradient="from-green-500/10 to-green-500/5"
            stats={[
              { label: "Pending", value: pendingActionsCount.toString() },
              { label: "Due soon", value: actions.filter(a => new Date(a.due_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length.toString() },
            ]}
            actions={[
              { 
                label: "View Tasks", 
                onClick: () => navigate('/actions'),
                variant: 'outline',
                icon: CheckSquare,
              },
            ]}
          />

          <SmartDashboardCard
            title="Meeting Insights"
            description="View analytics"
            icon={TrendingUp}
            gradient="from-purple-500/10 to-purple-500/5"
            stats={[
              { label: "This week", value: meetings.length.toString() },
              { label: "Total", value: meetings.length.toString() },
            ]}
            actions={[
              { 
                label: "View Report", 
                onClick: () => navigate('/analytics'),
                icon: FileText,
              },
            ]}
          />
        </div>

        {/* Today's Meetings */}
        {meetings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Upcoming Meetings</h2>
                <p className="text-sm text-muted-foreground">Quick access to your scheduled meetings</p>
              </div>
            </div>
            
            <div className="grid gap-3">
              {meetings.map((meeting) => {
                const startTime = new Date(meeting.start_time);
                const endTime = new Date(meeting.end_time);
                const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                
                return (
                  <InlineMeetingCard 
                    key={meeting.id}
                    id={meeting.id}
                    title={meeting.title}
                    date={formatMeetingDate(meeting.start_time)}
                    time={format(startTime, "h:mm a")}
                    duration={`${duration} min`}
                    location={meeting.location || "TBD"}
                    attendees={0}
                    status="upcoming"
                    agendaItems={0}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Active Actions */}
        {actions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Active Actions</h2>
                <p className="text-sm text-muted-foreground">Track your high-priority tasks</p>
              </div>
            </div>

            <div className="grid gap-3">
              {actions.map((action) => {
                const dueDate = new Date(action.due_date);
                const isOverdue = dueDate < new Date() && action.status !== 'completed';
                
                return (
                  <Card 
                    key={action.id} 
                    className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.01]"
                    onClick={() => navigate('/actions')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {action.priority}
                            </Badge>
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3" />
                              {format(dueDate, "MMM d")}
                            </span>
                          </div>
                          
                          <p className="font-medium">{action.title}</p>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{action.assignee?.full_name || 'Unassigned'}</span>
                            </div>
                            {action.meeting && (
                              <span className="text-xs text-muted-foreground">
                                From: {action.meeting.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <QuickActionFAB />
    </Layout>
  );
}
