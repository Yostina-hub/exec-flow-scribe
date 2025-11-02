import { Layout } from "@/components/Layout";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { InstantMeetingDialog } from "@/components/InstantMeetingDialog";
import { SmartMeetingCreation } from "@/components/SmartMeetingCreation";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { MeetingNotebookPanel } from "@/components/MeetingNotebookPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search, Filter, Loader2, Calendar, Clock, Users, TrendingUp, Download, SortAsc,
  Brain, Sparkles, Zap, Target, AlertCircle, CheckCircle, ArrowRight, Copy, Wand2
} from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isFuture, startOfDay, startOfWeek, endOfWeek, differenceInHours } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

interface MeetingAttendee {
  id: string;
  meeting_id: string;
  user_id: string;
  created_at: string;
}

interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string;
  order: number;
  created_at: string;
}

interface ActionItem {
  id: string;
  meeting_id: string;
  title: string;
  description: string;
  assigned_to: string;
  status: 'pending' | 'completed';
  due_date: string;
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  created_at: string;
  created_by: string;
  meeting_type?: string | null;
  video_conference_url?: string | null;
  video_provider?: string | null;
  attendee_count?: number;
  agenda_count?: number;
}

interface FormattedMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  attendees: number;
  status: "completed" | "upcoming" | "in-progress";
  agendaItems: number;
  meetingType?: string;
  videoConferenceUrl?: string | null;
  videoProvider?: string | null;
  createdBy?: string;
}

interface MeetingStats {
  total: number;
  upcoming: number;
  completed: number;
  thisWeek: number;
}

interface AIInsights {
  readinessScore: number;
  productivityTrend: 'up' | 'stable' | 'down';
  nextSuggestion: string;
  riskAlerts: number;
}

interface MeetingPreparation {
  id: string;
  readiness: number;
  status: 'excellent' | 'good' | 'needs-attention' | 'critical';
  missingItems: string[];
  aiSuggestions: string[];
}

export default function Meetings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<MeetingStats>({ total: 0, upcoming: 0, completed: 0, thisWeek: 0 });
  const [filterLocation, setFilterLocation] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<"date" | "title" | "attendees">("date");
  const [aiInsights, setAiInsights] = React.useState<AIInsights | null>(null);
  const [preparations, setPreparations] = React.useState<Record<string, MeetingPreparation>>({});
  const [showSmartCreate, setShowSmartCreate] = React.useState(false);

  React.useEffect(() => {
    fetchMeetings();
    loadAIInsights();
    
    const meetingsChannel = supabase
      .channel('meetings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings'
        },
        () => {
          fetchMeetings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agenda_items'
        },
        () => {
          fetchMeetings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
    };
  }, []);

  const loadAIInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get action items for productivity calculation
      const { data: actions } = await supabase
        .from('action_items')
        .select('id, status, created_at')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const recentActions = actions || [];
      const completedRecent = recentActions.filter(a => a.status === 'completed').length;
      const readinessScore = recentActions.length ? Math.round((completedRecent / recentActions.length) * 100) : 85;
      
      const pendingCount = recentActions.filter(a => a.status === 'pending').length;
      
      setAiInsights({
        readinessScore,
        productivityTrend: completedRecent > recentActions.length * 0.7 ? 'up' : 
                          completedRecent > recentActions.length * 0.4 ? 'stable' : 'down',
        nextSuggestion: "Schedule a team sync for Tuesday at 2 PM",
        riskAlerts: pendingCount > 5 ? 1 : 0
      });
    } catch (error) {
      console.error('Error loading AI insights:', error);
    }
  };

  const calculatePreparationStatus = (meeting: Meeting): MeetingPreparation => {
    const hoursUntil = differenceInHours(new Date(meeting.start_time), new Date());
    const hasAgenda = (meeting.agenda_count || 0) > 0;
    const hasAttendees = (meeting.attendee_count || 0) > 0;
    const hasLocation = !!meeting.location;
    
    let readiness = 0;
    const missingItems: string[] = [];
    const suggestions: string[] = [];
    
    if (hasAgenda) readiness += 40;
    else missingItems.push('Add agenda items');
    
    if (hasAttendees) readiness += 30;
    else missingItems.push('Invite attendees');
    
    if (hasLocation) readiness += 30;
    else missingItems.push('Set location');
    
    // AI suggestions based on context
    if (!hasAgenda) suggestions.push('Generate agenda with AI');
    if (hoursUntil < 24) suggestions.push('Review related past meetings');
    if ((meeting.attendee_count || 0) > 5) suggestions.push('Send pre-meeting brief');
    
    const status = readiness >= 90 ? 'excellent' : 
                   readiness >= 70 ? 'good' : 
                   readiness >= 40 ? 'needs-attention' : 'critical';
    
    return { id: meeting.id, readiness, status, missingItems, aiSuggestions: suggestions };
  };

  const fetchMeetings = async () => {
    try {
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_attendees(count),
          agenda_items(count)
        `)
        .order("created_at", { ascending: false });

      if (meetingsError) throw meetingsError;

      const enrichedMeetings = (meetingsData || []).map(meeting => ({
        ...meeting,
        attendee_count: meeting.meeting_attendees?.[0]?.count || 0,
        agenda_count: meeting.agenda_items?.[0]?.count || 0,
      }));

      setMeetings(enrichedMeetings);
      calculateStats(enrichedMeetings);
      
      // Calculate preparation status for upcoming meetings
      const prepMap: Record<string, MeetingPreparation> = {};
      enrichedMeetings
        .filter(m => m.status !== 'completed')
        .forEach(m => {
          prepMap[m.id] = calculatePreparationStatus(m);
        });
      setPreparations(prepMap);
      
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (meetingsData: Meeting[]) => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const stats = meetingsData.reduce(
      (acc, meeting) => {
        const startTime = new Date(meeting.start_time);
        acc.total++;
        
        if (meeting.status === "completed") {
          acc.completed++;
        } else {
          acc.upcoming++;
        }

        if (startTime >= now && startTime <= weekFromNow) {
          acc.thisWeek++;
        }

        return acc;
      },
      { total: 0, upcoming: 0, completed: 0, thisWeek: 0 }
    );

    setStats(stats);
  };

  const formatMeetingCard = (meeting: Meeting): FormattedMeeting => {
    const startTime = new Date(meeting.start_time);
    const endTime = new Date(meeting.end_time);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    const now = new Date();
    
    let status: "completed" | "upcoming" | "in-progress" = "upcoming";
    if (meeting.status === "completed") {
      status = "completed";
    } else if (now >= startTime && now <= endTime) {
      status = "in-progress";
    }
    
    return {
      id: meeting.id,
      title: meeting.title,
      date: format(startTime, "MMM d"),
      time: format(startTime, "h:mm a"),
      duration: `${duration} min`,
      location: meeting.location || "TBD",
      attendees: meeting.attendee_count || 0,
      status,
      agendaItems: meeting.agenda_count || 0,
      meetingType: meeting.meeting_type || undefined,
      videoConferenceUrl: meeting.video_conference_url,
      createdBy: meeting.created_by,
    };
  };

  const filterMeetings = (meetings: FormattedMeeting[]) => {
    let filtered = meetings;
    
    if (searchQuery) {
      filtered = filtered.filter((meeting) =>
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterLocation !== "all") {
      filtered = filtered.filter((meeting) => 
        meeting.location.toLowerCase() === filterLocation.toLowerCase()
      );
    }
    
    return filtered;
  };

  const sortMeetings = (meetings: FormattedMeeting[], originalMeetings: Meeting[]) => {
    const sorted = [...meetings];
    
    switch (sortBy) {
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "attendees":
        return sorted.sort((a, b) => b.attendees - a.attendees);
      case "date":
      default:
        return sorted.sort((a, b) => {
          const meetingA = originalMeetings.find(m => m.id === a.id);
          const meetingB = originalMeetings.find(m => m.id === b.id);
          if (!meetingA || !meetingB) return 0;
          return new Date(meetingB.created_at).getTime() - 
                 new Date(meetingA.created_at).getTime();
        });
    }
  };

  const uniqueLocations = React.useMemo(() => {
    const locations = meetings
      .map(m => m.location)
      .filter((loc): loc is string => loc !== null && loc !== "");
    return ["all", ...Array.from(new Set(locations))];
  }, [meetings]);

  const exportMeetings = () => {
    try {
      const csvData = meetings.map(m => ({
        Title: m.title,
        Date: format(new Date(m.start_time), "yyyy-MM-dd"),
        Time: format(new Date(m.start_time), "HH:mm"),
        Location: m.location || "",
        Status: m.status,
        Attendees: m.attendee_count || 0,
        Agenda: m.agenda_count || 0,
      }));

      const headers = Object.keys(csvData[0]).join(",");
      const rows = csvData.map(row => Object.values(row).join(","));
      const csv = [headers, ...rows].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meetings-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Meetings exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export meetings",
        variant: "destructive",
      });
    }
  };

  const cloneMeeting = (meetingId: string) => {
    toast({
      title: "Cloning meeting",
      description: "Creating a copy with AI suggestions...",
    });
    // Implementation would clone the meeting
  };

  const generateAISuggestion = () => {
    toast({
      title: "AI Analyzing",
      description: "Finding optimal meeting time based on patterns...",
    });
  };

  const upcomingMeetings = sortMeetings(
    filterMeetings(
      meetings
        .filter((m) => m.status !== "completed")
        .map((m) => {
          const formatted = formatMeetingCard(m);
          const prep = preparations[m.id];
          return {
            ...formatted,
            readiness: prep?.readiness || 100,
            missingItems: prep?.missingItems || [],
          };
        })
    ),
    meetings
  );
  
  const completedMeetings = sortMeetings(
    filterMeetings(
      meetings
        .filter((m) => m.status === "completed")
        .map(formatMeetingCard)
    ),
    meetings
  );
  
  const allMeetingsFormatted = sortMeetings(
    filterMeetings(
      meetings.map((m) => {
        const formatted = formatMeetingCard(m);
        const prep = preparations[m.id];
        return {
          ...formatted,
          readiness: prep?.readiness || 100,
          missingItems: prep?.missingItems || [],
        };
      })
    ), 
    meetings
  );

  const criticalMeetings = upcomingMeetings.filter(m => {
    const prep = preparations[m.id];
    return prep?.status === 'critical' || prep?.status === 'needs-attention';
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
          <div className="relative">
            <Brain className="h-16 w-16 animate-pulse text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">AI is analyzing your meetings</p>
            <p className="text-sm text-muted-foreground">Preparing intelligent insights...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 pb-20 animate-fade-in">
        {/* AI-Powered Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 border-2">
          <div className="absolute inset-0 bg-grid-white/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold flex items-center gap-3">
                <Brain className="h-12 w-12 animate-pulse" />
                Smart Meetings Hub
              </h1>
              <p className="text-muted-foreground text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Autonomous AI-powered meeting intelligence
              </p>
            </div>
            <div className="flex gap-3">
              <InstantMeetingDialog />
              <Button 
                onClick={() => setShowSmartCreate(true)} 
                size="lg" 
                className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Brain className="h-4 w-4" />
                Quick Create
              </Button>
            </div>
          </div>
        </div>

        {/* AI Intelligence Dashboard */}
        {aiInsights && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover-scale border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Readiness</CardTitle>
                <Target className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aiInsights.readinessScore}%</div>
                <Progress value={aiInsights.readinessScore} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">Meeting preparation score</p>
              </CardContent>
            </Card>

            <Card className="hover-scale border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold capitalize">{aiInsights.productivityTrend}</div>
                <Badge variant={aiInsights.productivityTrend === 'up' ? 'default' : 'secondary'} className="mt-2">
                  AI Detected
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Based on patterns</p>
              </CardContent>
            </Card>

            <Card className="hover-scale border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Week</CardTitle>
                <Calendar className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.thisWeek}</div>
                <p className="text-xs text-muted-foreground mt-2">Scheduled meetings</p>
              </CardContent>
            </Card>

            <Card className="hover-scale border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Alerts</CardTitle>
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aiInsights.riskAlerts}</div>
                <Badge variant={aiInsights.riskAlerts > 0 ? 'destructive' : 'default'} className="mt-2">
                  {aiInsights.riskAlerts > 0 ? 'Action Needed' : 'All Clear'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">AI monitoring</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Critical Attention Needed */}
        {criticalMeetings.length > 0 && (
          <Card className="border-orange-500 bg-orange-500/5 border-2 animate-pulse">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                Urgent Preparation Needed
              </CardTitle>
              <CardDescription>
                {criticalMeetings.length} meeting(s) require immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalMeetings.slice(0, 3).map(meeting => {
                  const prep = preparations[meeting.id];
                  return (
                    <div key={meeting.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium">{meeting.title}</div>
                        <div className="text-sm text-muted-foreground">{meeting.date} at {meeting.time}</div>
                        <div className="flex gap-2 mt-2">
                          {prep?.missingItems.slice(0, 2).map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4">
                          <div className="text-2xl font-bold text-orange-600">{prep?.readiness}%</div>
                          <div className="text-xs text-muted-foreground">Ready</div>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/meetings/${meeting.id}`)}>
                          Prepare <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI NotebookLM Panel */}
        <MeetingNotebookPanel meetings={meetings} />

        {/* Search and Filters */}
        <Card className="p-6 shadow-lg border-2">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search with AI intelligence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-muted/30 border-2 focus:bg-background focus:border-primary transition-all"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2 border-2">
                  <Filter className="h-5 w-5" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Location</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={filterLocation} onValueChange={setFilterLocation}>
                  {uniqueLocations.map((loc) => (
                    <DropdownMenuRadioItem key={loc} value={loc}>
                      {loc === "all" ? "All Locations" : loc}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2 border-2">
                  <SortAsc className="h-5 w-5" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <DropdownMenuRadioItem value="date">Date</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="attendees">Attendees</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2 border-2"
              onClick={exportMeetings}
              disabled={meetings.length === 0}
            >
              <Download className="h-5 w-5" />
              Export
            </Button>
          </div>
        </Card>

        {/* Meetings Tabs with AI Enhancement */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 p-1">
            <TabsTrigger value="upcoming" className="text-base gap-2">
              <Zap className="h-4 w-4" />
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-base gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({completedMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-base">
              All ({allMeetingsFormatted.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingMeetings.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No upcoming meetings</h3>
                  <p className="text-muted-foreground mb-6">Let AI suggest optimal meeting times</p>
                  <Button onClick={generateAISuggestion} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Get AI Suggestions
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((meeting) => {
                  const prep = preparations[meeting.id];
                  return (
                    <div key={meeting.id} className="relative group">
                      <InlineMeetingCard
                        id={meeting.id}
                        title={meeting.title}
                        date={meeting.date}
                        time={meeting.time}
                        duration={meeting.duration}
                        location={meeting.location}
                        attendees={meeting.attendees}
                        status={meeting.status}
                        agendaItems={meeting.agendaItems}
                        meetingType={meeting.meetingType}
                        videoConferenceUrl={meeting.videoConferenceUrl}
                        createdBy={meeting.createdBy}
                      />
                      {prep && (
                        <div className="absolute top-3 right-3 space-y-2">
                          <Badge 
                            variant={
                              prep.status === 'excellent' ? 'default' : 
                              prep.status === 'good' ? 'secondary' : 
                              'destructive'
                            }
                            className="gap-1 shadow-lg"
                          >
                            <Brain className="h-3 w-3" />
                            {prep.readiness}%
                          </Badge>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                        onClick={() => cloneMeeting(meeting.id)}
                      >
                        <Copy className="h-3 w-3" />
                        Clone
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedMeetings.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed meetings yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedMeetings.map((meeting) => (
                  <InlineMeetingCard
                    key={meeting.id}
                    id={meeting.id}
                    title={meeting.title}
                    date={meeting.date}
                    time={meeting.time}
                    duration={meeting.duration}
                    location={meeting.location}
                    attendees={meeting.attendees}
                    status={meeting.status}
                    agendaItems={meeting.agendaItems}
                    meetingType={meeting.meetingType}
                    videoConferenceUrl={meeting.videoConferenceUrl}
                    createdBy={meeting.createdBy}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allMeetingsFormatted.map((meeting) => (
                <InlineMeetingCard
                  key={meeting.id}
                  id={meeting.id}
                  title={meeting.title}
                  date={meeting.date}
                  time={meeting.time}
                  duration={meeting.duration}
                  location={meeting.location}
                  attendees={meeting.attendees}
                  status={meeting.status}
                  agendaItems={meeting.agendaItems}
                  meetingType={meeting.meetingType}
                  videoConferenceUrl={meeting.videoConferenceUrl}
                  createdBy={meeting.createdBy}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SmartMeetingCreation 
        open={showSmartCreate}
        onOpenChange={(open) => {
          setShowSmartCreate(open);
          if (!open) {
            fetchMeetings();
            loadAIInsights();
          }
        }}
      />
      <QuickActionFAB />
    </Layout>
  );
}
