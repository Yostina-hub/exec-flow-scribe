import { Layout } from "@/components/Layout";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { InstantMeetingDialog } from "@/components/InstantMeetingDialog";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { ImportScheduleButton } from "@/components/ImportScheduleButton";
import { CleanupDuplicatesButton } from "@/components/CleanupDuplicatesButton";
import { DeleteCEOScheduleButton } from "@/components/DeleteCEOScheduleButton";
import { MeetingNotebookPanel } from "@/components/MeetingNotebookPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Loader2, Calendar, Clock, Users, TrendingUp, Download, SortAsc } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isFuture, startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  created_at: string;
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
}

interface MeetingStats {
  total: number;
  upcoming: number;
  completed: number;
  thisWeek: number;
}

export default function Meetings() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MeetingStats>({ total: 0, upcoming: 0, completed: 0, thisWeek: 0 });
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "title" | "attendees">("date");

  useEffect(() => {
    fetchMeetings();
    
    // Set up realtime subscription for meetings and agenda items
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

  const fetchMeetings = async () => {
    try {
      // Fetch meetings with attendee and agenda counts - order by created_at descending so newest meetings appear first
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
    };
  };

  const filterMeetings = (meetings: FormattedMeeting[]) => {
    let filtered = meetings;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((meeting) =>
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply location filter
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
        // Sort by created_at descending by default (newest first)
        return sorted.sort((a, b) => {
          const meetingA = originalMeetings.find(m => m.id === a.id);
          const meetingB = originalMeetings.find(m => m.id === b.id);
          if (!meetingA || !meetingB) return 0;
          return new Date(meetingB.created_at).getTime() - 
                 new Date(meetingA.created_at).getTime();
        });
    }
  };

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
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

  const upcomingMeetings = sortMeetings(
    filterMeetings(
      meetings
        .filter((m) => m.status !== "completed")
        .map(formatMeetingCard)
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
  
  const allMeetingsFormatted = sortMeetings(filterMeetings(meetings.map(formatMeetingCard)), meetings);

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
            <div className="flex gap-3">
              <InstantMeetingDialog />
              <CreateMeetingDialog />
            </div>
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

        {/* AI NotebookLM Panel */}
        <MeetingNotebookPanel meetings={meetings} />

        {/* Search and Filters */}
        <Card className="p-6 shadow-lg border-2">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meetings by title or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-muted/30 border-2 focus:bg-background focus:border-primary transition-all"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2 border-2 hover:border-primary hover:bg-primary/5">
                  <Filter className="h-5 w-5" />
                  Filter
                  {filterLocation !== "all" && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                      1
                    </span>
                  )}
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
                <Button variant="outline" size="lg" className="gap-2 border-2 hover:border-primary hover:bg-primary/5">
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
              className="gap-2 border-2 hover:border-primary hover:bg-primary/5"
              onClick={exportMeetings}
              disabled={meetings.length === 0}
            >
              <Download className="h-5 w-5" />
              Export
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

        <QuickActionFAB />
      </div>
    </Layout>
  );
}

