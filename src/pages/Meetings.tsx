import { Layout } from "@/components/Layout";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Loader2, Calendar, Clock, Users, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isFuture, startOfDay } from "date-fns";

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
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
}

interface MeetingStats {
  total: number;
  upcoming: number;
  completed: number;
  thisWeek: number;
}

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MeetingStats>({ total: 0, upcoming: 0, completed: 0, thisWeek: 0 });

  useEffect(() => {
    fetchMeetings();
    
    // Set up realtime subscription
    const channel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMeetings = async () => {
    try {
      // Fetch meetings with attendee and agenda counts
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_attendees(count),
          agenda_items(count)
        `)
        .order("start_time", { ascending: true });

      if (meetingsError) throw meetingsError;

      const enrichedMeetings = (meetingsData || []).map(meeting => ({
        ...meeting,
        attendee_count: meeting.meeting_attendees?.[0]?.count || 0,
        agenda_count: meeting.agenda_items?.[0]?.count || 0,
      }));

      setMeetings(enrichedMeetings);
      calculateStats(enrichedMeetings);
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
    
    // Determine status: in-progress if current time is between start and end
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
    };
  };

  const filterMeetings = (meetings: FormattedMeeting[]) => {
    if (!searchQuery) return meetings;
    return meetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const upcomingMeetings = meetings
    .filter((m) => m.status !== "completed")
    .map(formatMeetingCard)
    .sort((a, b) => new Date(meetings.find(m => m.id === a.id)!.start_time).getTime() - 
                     new Date(meetings.find(m => m.id === b.id)!.start_time).getTime());
  
  const completedMeetings = meetings
    .filter((m) => m.status === "completed")
    .map(formatMeetingCard)
    .sort((a, b) => new Date(meetings.find(m => m.id === b.id)!.start_time).getTime() - 
                     new Date(meetings.find(m => m.id === a.id)!.start_time).getTime());
  
  const allMeetingsFormatted = meetings.map(formatMeetingCard);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Loading your meetings</p>
            <p className="text-sm text-muted-foreground">Preparing your schedule...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 pb-20 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-secondary p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold font-['Space_Grotesk'] text-white drop-shadow-lg">
                Meetings
              </h1>
              <p className="text-white/90 text-lg">Your complete meeting management hub</p>
            </div>
            <CreateMeetingDialog />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Meetings</CardTitle>
              <Calendar className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
              <Clock className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.upcoming}</div>
              <p className="text-xs text-muted-foreground mt-1">Scheduled meetings</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground mt-1">Past meetings</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
              <Users className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.thisWeek}</div>
              <p className="text-xs text-muted-foreground mt-1">Next 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-6 shadow-lg border-2">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meetings by title or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-muted/30 border-2 focus:bg-background focus:border-primary transition-all"
              />
            </div>
            <Button variant="outline" size="lg" className="gap-2 border-2 hover:border-primary hover:bg-primary/5">
              <Filter className="h-5 w-5" />
              Filters
            </Button>
          </div>
        </Card>

        {/* Meetings Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 p-1">
            <TabsTrigger value="upcoming" className="text-base">
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-base">
              Completed ({completedMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-base">
              All ({allMeetingsFormatted.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6 space-y-6">
            {filterMeetings(upcomingMeetings).length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">No upcoming meetings</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Try adjusting your search" : "Create your first meeting to get started"}
                    </p>
                  </div>
                  {!searchQuery && <CreateMeetingDialog />}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filterMeetings(upcomingMeetings).map((meeting) => (
                  <InlineMeetingCard key={meeting.id} {...meeting} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6 space-y-6">
            {filterMeetings(completedMeetings).length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="h-10 w-10 text-green-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">No completed meetings</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Try adjusting your search" : "Completed meetings will appear here"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filterMeetings(completedMeetings).map((meeting) => (
                  <InlineMeetingCard key={meeting.id} {...meeting} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6 space-y-6">
            {filterMeetings(allMeetingsFormatted).length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">No meetings found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? "Try adjusting your search" : "Create your first meeting to get started"}
                    </p>
                  </div>
                  {!searchQuery && <CreateMeetingDialog />}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filterMeetings(allMeetingsFormatted).map((meeting) => (
                  <InlineMeetingCard key={meeting.id} {...meeting} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <QuickActionFAB />
    </Layout>
  );
}
