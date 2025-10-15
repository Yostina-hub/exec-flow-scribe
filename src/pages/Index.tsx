import { Layout } from "@/components/Layout";
import { SmartDashboardCard } from "@/components/SmartDashboardCard";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { 
  Calendar, Play, FileText, TrendingUp, Clock, 
  Users, Zap, Target, CheckSquare, Loader2, Sparkles,
  BarChart3, Activity, Rocket
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
      <div className="space-y-8 pb-20">
        {/* Animated Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 p-8 border border-purple-500/20 animate-fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 animate-scale-in">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium">Live Dashboard</span>
              </div>
              
              <h1 className="text-5xl font-bold font-['Space_Grotesk'] animate-fade-in">
                Welcome Back! 
                <span className="inline-block animate-bounce ml-3">👋</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl">
                You have <span className="font-bold text-purple-400">{todayMeetingsCount}</span> meeting{todayMeetingsCount !== 1 ? 's' : ''} today and{' '}
                <span className="font-bold text-blue-400">{pendingActionsCount}</span> pending action{pendingActionsCount !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="hidden md:block text-right space-y-2 animate-scale-in">
              <div className="text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {format(currentTime, 'HH:mm')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentTime, 'EEEE, MMMM d')}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Calendar, label: "Today's Meetings", value: todayMeetingsCount, color: "from-blue-500 to-cyan-500", delay: "0" },
            { icon: Target, label: "Pending Actions", value: pendingActionsCount, color: "from-purple-500 to-pink-500", delay: "100" },
            { icon: Activity, label: "Active Projects", value: meetings.length, color: "from-green-500 to-emerald-500", delay: "200" },
            { icon: TrendingUp, label: "Completion Rate", value: "87%", color: "from-orange-500 to-red-500", delay: "300" },
          ].map((stat, i) => (
            <Card 
              key={i}
              className="relative overflow-hidden group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-background to-muted/50 backdrop-blur-xl animate-scale-in"
              style={{ animationDelay: `${stat.delay}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl font-bold font-['Space_Grotesk']">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Smart Action Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Upcoming Meetings with Enhanced Design */}
        {meetings.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold font-['Space_Grotesk'] flex items-center gap-3">
                  <Rocket className="h-8 w-8 text-purple-500" />
                  Upcoming Meetings
                </h2>
                <p className="text-sm text-muted-foreground mt-2">Quick access to your scheduled meetings</p>
              </div>
            </div>
            
            <div className="grid gap-4">
              {meetings.map((meeting, index) => {
                const startTime = new Date(meeting.start_time);
                const endTime = new Date(meeting.end_time);
                const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                
                return (
                  <div 
                    key={meeting.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <InlineMeetingCard 
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Actions with Modern Cards */}
        {actions.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold font-['Space_Grotesk'] flex items-center gap-3">
                  <Zap className="h-8 w-8 text-yellow-500" />
                  Active Actions
                </h2>
                <p className="text-sm text-muted-foreground mt-2">Track your high-priority tasks</p>
              </div>
            </div>

            <div className="grid gap-4">
              {actions.map((action, index) => {
                const dueDate = new Date(action.due_date);
                const isOverdue = dueDate < new Date() && action.status !== 'completed';
                
                return (
                  <Card 
                    key={action.id} 
                    className="group hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] border-0 bg-gradient-to-br from-background to-muted/30 backdrop-blur-xl animate-scale-in"
                    onClick={() => navigate('/actions')}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs font-semibold"
                            >
                              {action.priority}
                            </Badge>
                            <span className={`text-xs flex items-center gap-1 font-medium ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3" />
                              {format(dueDate, "MMM d")}
                            </span>
                          </div>
                          
                          <p className="font-semibold text-lg">{action.title}</p>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{action.assignee?.full_name || 'Unassigned'}</span>
                            </div>
                            {action.meeting && (
                              <span className="text-sm text-muted-foreground">
                                From: {action.meeting.title}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                          <CheckSquare className="h-6 w-6 text-purple-500" />
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
