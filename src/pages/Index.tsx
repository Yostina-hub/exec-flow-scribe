import { Layout } from "@/components/Layout";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { CEOBriefing } from "@/components/CEOBriefing";
import { GuestAccessStatus } from "@/components/GuestAccessStatus";
import { useIsGuest } from "@/hooks/useIsGuest";
import GuestDashboard from "./GuestDashboard";
import { UnifiedMeetingHub } from "@/components/UnifiedMeetingHub";
import { 
  Calendar, Play, FileText, TrendingUp, Clock, 
  Users, Zap, Target, CheckSquare, Loader2, Sparkles,
  BarChart3, Activity, Rocket, CalendarDays, ArrowUpRight, Brain, Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, startOfWeek, endOfWeek, isSameDay } from "date-fns";

export default function Index() {
  const navigate = useNavigate();
  const { isGuest, loading: guestLoading } = useIsGuest();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [completionRate, setCompletionRate] = useState(0);
  const [totalActions, setTotalActions] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [weekMeetings, setWeekMeetings] = useState<any[]>([]);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isCEO, setIsCEO] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const openedRef = useRef(false);

  // Redirect guests to their dedicated dashboard
  useEffect(() => {
    if (!guestLoading && isGuest) {
      navigate("/guest");
    }
  }, [isGuest, guestLoading, navigate]);

  useEffect(() => {
    checkUserRole();
    fetchData();
    
    // Real-time clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Real-time data updates
    const meetingsChannel = supabase
      .channel('dashboard-meetings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchData();
      })
      .subscribe();

    const actionsChannel = supabase
      .channel('dashboard-actions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items' }, () => {
        fetchData();
      })
      .subscribe();
    
    return () => {
      clearInterval(timer);
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(actionsChannel);
    };
  }, []);

  // Open briefing on every SIGNED_IN event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        openedRef.current = false; // reset so it opens again for this login
        setTimeout(async () => {
          try {
            const userId = session?.user?.id;
            if (!userId) return;
            const { data: userRoles } = await supabase
              .from('user_roles')
              .select('roles(name)')
              .eq('user_id', userId);
            const hasCEORole = (userRoles || []).some((ur: any) => ur.roles?.name?.toLowerCase().includes('ceo') || ur.roles?.name?.toLowerCase().includes('executive'));
            if (hasCEORole) {
              setShowBriefing(true);
            }
          } catch (e) {
            console.error('Auto-open on sign-in failed:', e);
          }
        }, 0);
      }
      if (event === 'SIGNED_OUT') {
        openedRef.current = false;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Ensure it opens once per page visit when already authenticated
  useEffect(() => {
    if (isCEO && !loading && !openedRef.current) {
      openedRef.current = true;
      setTimeout(() => setShowBriefing(true), 800);
    }
  }, [isCEO, loading]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has CEO role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id);

      if (userRoles) {
        const hasCEORole = userRoles.some((ur: any) => 
          ur.roles?.name?.toLowerCase().includes('ceo') || 
          ur.roles?.name?.toLowerCase().includes('executive')
        );
        setIsCEO(hasCEORole);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch this week's meetings for calendar
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      
      const { data: allMeetingsData } = await supabase
        .from("meetings")
        .select("*, event_categories(name, color_hex)")
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .order("start_time", { ascending: true });

      setWeekMeetings(allMeetingsData || []);

      // Derive today's meetings from the weekly dataset to avoid extra queries
      const todaysMeetings = (allMeetingsData || [])
        .filter((m: any) => isSameDay(new Date(m.start_time), new Date()))
        .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      const { data: actionsData } = await supabase
        .from("action_items")
        .select("*")
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true})
        .limit(3);

      // Fetch completion rate
      const { data: allActions } = await supabase
        .from("action_items")
        .select("status");
      
      if (allActions && allActions.length > 0) {
        const completed = allActions.filter(a => a.status === 'completed').length;
        const rate = Math.round((completed / allActions.length) * 100);
        setCompletionRate(rate);
        setTotalActions(allActions.length);
      }

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

      setMeetings(todaysMeetings || []);
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

  const todayMeetingsCount = meetings.length;
  const pendingActionsCount = actions.length;
  
  // Filter meetings based on search query
  const filteredMeetings = meetings.filter((meeting) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      meeting.title?.toLowerCase().includes(query) ||
      meeting.location?.toLowerCase().includes(query)
    );
  });
  
  // Get meetings for selected calendar date
  const selectedDateMeetings = weekMeetings.filter(m => 
    selectedCalendarDate && isSameDay(new Date(m.start_time), selectedCalendarDate)
  );

  // Calculate dates with meetings for calendar
  const datesWithMeetings = weekMeetings.map(m => new Date(m.start_time));

  // Show neutral loading screen while checking guest status - no layout to prevent flash
  if (loading || guestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Return null while navigation happens for guests - prevents any flash of regular dashboard
  if (isGuest) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-4 lg:space-y-8 pb-16 lg:pb-20">
        {/* Animated Hero Section */}
        <div className="relative overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 p-4 lg:p-8 border border-purple-500/20 animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 lg:w-96 lg:h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" />
          <div className="absolute bottom-0 left-0 w-64 h-64 lg:w-96 lg:h-96 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000 hidden lg:block" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="space-y-3 lg:space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 animate-scale-in">
                <Sparkles className="h-3 w-3 lg:h-4 lg:w-4 text-purple-400" />
                <span className="text-xs lg:text-sm font-medium">
                  {isCEO ? 'AI-Powered Executive Dashboard' : 'Live Dashboard'}
                </span>
              </div>
              
              <h1 className="text-3xl lg:text-5xl font-bold font-['Space_Grotesk'] animate-fade-in">
                Welcome Back! 
                <span className="inline-block animate-bounce ml-2 lg:ml-3">👋</span>
              </h1>
              
              <p className="text-sm lg:text-lg text-muted-foreground max-w-2xl">
                You have <span className="font-bold text-purple-400">{todayMeetingsCount}</span> meeting{todayMeetingsCount !== 1 ? 's' : ''} today and{' '}
                <span className="font-bold text-blue-400">{pendingActionsCount}</span> pending action{pendingActionsCount !== 1 ? 's' : ''}
              </p>

              {isCEO && (
                <Button
                  onClick={() => setShowBriefing(true)}
                  className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 mt-4 group"
                >
                  <Brain className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  AI Executive Briefing
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="text-right space-y-2 animate-scale-in">
              <div className="text-2xl lg:text-4xl font-bold font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {format(currentTime, 'HH:mm')}
              </div>
              <div className="text-xs lg:text-sm text-muted-foreground">
                {format(currentTime, 'EEE, MMM d')}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid gap-3 lg:gap-6 grid-cols-2 lg:grid-cols-4">
        {[
            { icon: Calendar, label: "Today's Meetings", value: todayMeetingsCount, color: "from-blue-500 to-cyan-500", delay: "0" },
            { icon: Target, label: "Pending Actions", value: pendingActionsCount, color: "from-purple-500 to-pink-500", delay: "100" },
            { icon: Activity, label: "Total Actions", value: totalActions, color: "from-green-500 to-emerald-500", delay: "200" },
            { icon: TrendingUp, label: "Completion Rate", value: `${completionRate}%`, color: "from-orange-500 to-red-500", delay: "300" },
          ].map((stat, i) => (
            <Card 
              key={i}
              className="relative overflow-hidden group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-background to-muted/50 backdrop-blur-xl animate-scale-in"
              style={{ animationDelay: `${stat.delay}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <CardContent className="p-3 lg:p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                  <div className="space-y-1 lg:space-y-2 w-full">
                    <p className="text-xs lg:text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl lg:text-4xl font-bold font-['Space_Grotesk']">{stat.value}</p>
                  </div>
                  <div className={`p-2 lg:p-4 rounded-xl lg:rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300 self-end lg:self-auto`}>
                    <stat.icon className="h-5 w-5 lg:h-8 lg:w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Guest Access Status */}
        <GuestAccessStatus />

        {/* Unified Meeting Hub - Revolutionary Multi-device Access */}
        <UnifiedMeetingHub />

        {/* Executive Dashboard Component */}
        <ExecutiveDashboard
          meetings={meetings}
          actions={actions}
          completionRate={completionRate}
          totalActions={totalActions}
          loading={loading}
        />

        {/* Quick Calendar Widget */}
        <div className="grid gap-6 lg:grid-cols-3 animate-fade-in">
          <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-background via-muted/20 to-background backdrop-blur-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
                    <CalendarDays className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-['Space_Grotesk']">This Week</CardTitle>
                    <p className="text-sm text-muted-foreground">{weekMeetings.length} meetings scheduled</p>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className="gap-2 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => navigate('/calendar')}
                >
                  View Calendar
                  <ArrowUpRight className="h-3 w-3" />
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid lg:grid-cols-2 gap-6">
                <CalendarComponent
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={setSelectedCalendarDate}
                  className="rounded-md border-0"
                  modifiers={{
                    hasMeetings: datesWithMeetings,
                  }}
                  modifiersClassNames={{
                    hasMeetings: "bg-gradient-to-br from-purple-500/20 to-blue-500/20 font-bold border-2 border-purple-500/50",
                  }}
                />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse" />
                    {selectedCalendarDate ? format(selectedCalendarDate, "EEEE, MMM d") : "Select a date"}
                  </div>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedDateMeetings.length > 0 ? (
                      selectedDateMeetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          onClick={() => navigate(`/meetings/${meeting.id}`)}
                          className="p-3 rounded-lg bg-gradient-to-br from-background to-muted/30 border border-border/50 hover:border-purple-500/50 hover:shadow-lg transition-all duration-300 cursor-pointer group/meeting"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate group-hover/meeting:text-purple-500 transition-colors">
                                {meeting.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(meeting.start_time), "h:mm a")}
                                </span>
                                {meeting.event_categories && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs"
                                    style={{ 
                                      borderColor: meeting.event_categories.color_hex,
                                      color: meeting.event_categories.color_hex 
                                    }}
                                  >
                                    {meeting.event_categories.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={meeting.status === "completed" ? "success" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {meeting.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No meetings scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Progress */}
          <Card className="border-0 bg-gradient-to-br from-background via-muted/20 to-background backdrop-blur-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 animate-pulse" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-['Space_Grotesk']">Progress</CardTitle>
                  <p className="text-xs text-muted-foreground">Your performance metrics</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Task Completion</span>
                  <span className="text-2xl font-bold font-['Space_Grotesk'] text-green-500">
                    {completionRate}%
                  </span>
                </div>
                <div className="relative">
                  <Progress value={completionRate} className="h-3" />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 rounded-full blur-sm animate-pulse pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((completionRate / 100) * totalActions)} of {totalActions} actions completed
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Meetings Today</span>
                  </div>
                  <span className="text-lg font-bold">{todayMeetingsCount}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Pending Actions</span>
                  </div>
                  <span className="text-lg font-bold">{pendingActionsCount}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">This Week</span>
                  </div>
                  <span className="text-lg font-bold">{weekMeetings.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Meetings Section - Integrated with Executive Design */}
        {meetings.length > 0 && (
          <Card className="border-0 bg-gradient-to-br from-background to-muted/20 backdrop-blur-xl overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 animate-pulse" />
            
            <CardHeader className="relative">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-['Space_Grotesk']">Today's Schedule</CardTitle>
                    <p className="text-sm text-muted-foreground">{meetings.length} meetings</p>
                  </div>
                </div>
                
                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search meetings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 backdrop-blur-sm border-2"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative">
              {filteredMeetings.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {filteredMeetings.map((meeting, index) => {
                    const startTime = new Date(meeting.start_time);
                    const endTime = new Date(meeting.end_time);
                    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
                    
                    return (
                      <div
                        key={meeting.id}
                        className="p-4 rounded-xl bg-gradient-to-br from-background to-muted/30 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-base group-hover:text-primary transition-colors flex-1">
                            {meeting.title}
                          </h4>
                          <Badge 
                            variant="secondary"
                            className={`${
                              meeting.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                              meeting.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                              'bg-gray-500/10 text-gray-600'
                            } border-0 shrink-0`}
                          >
                            {meeting.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {format(startTime, "h:mm a")}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" />
                            {duration} min
                          </div>
                          {meeting.location && (
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {meeting.location}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No meetings found matching "{searchQuery}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Actions with Modern Cards */}
        {actions.length > 0 && (
          <div className="space-y-4 lg:space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl lg:text-3xl font-bold font-['Space_Grotesk'] flex items-center gap-2 lg:gap-3">
                  <Zap className="h-5 w-5 lg:h-8 lg:w-8 text-yellow-500" />
                  Active Actions
                </h2>
                <p className="text-xs lg:text-sm text-muted-foreground mt-1 lg:mt-2">Track your high-priority tasks</p>
              </div>
            </div>

            <div className="grid gap-3 lg:gap-4">
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
                    <CardContent className="p-4 lg:p-6">
                      <div className="flex items-start justify-between gap-3 lg:gap-4">
                        <div className="flex-1 space-y-2 lg:space-y-3">
                          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
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
                          
                          <p className="font-semibold text-base lg:text-lg">{action.title}</p>
                          
                          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4">
                            <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                              <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                              <span>{action.assignee?.full_name || 'Unassigned'}</span>
                            </div>
                            {action.meeting && (
                              <span className="text-xs lg:text-sm text-muted-foreground">
                               From: {action.meeting.title}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                          <CheckSquare className="h-5 w-5 lg:h-6 lg:w-6 text-purple-500" />
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

      {/* CEO Briefing Dialog */}
      <CEOBriefing open={showBriefing} onClose={() => setShowBriefing(false)} />

      <QuickActionFAB />
    </Layout>
  );
}
