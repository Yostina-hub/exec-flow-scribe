import { Layout } from "@/components/Layout";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { InstantMeetingDialog } from "@/components/InstantMeetingDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Calendar, Plus, Filter, Clock, Users, TrendingUp, Sparkles, Video, MapPin } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

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


const ITEMS_PER_PAGE = 8;

export default function Meetings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  const [searchQuery, setSearchQuery] = React.useState("");
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentPageUpcoming, setCurrentPageUpcoming] = React.useState(1);
  const [currentPageCompleted, setCurrentPageCompleted] = React.useState(1);
  const [currentPageAll, setCurrentPageAll] = React.useState(1);
  const [stats, setStats] = React.useState({ upcoming: 0, inProgress: 0, completed: 0, total: 0 });

  React.useEffect(() => {
    fetchMeetings();
    
    const meetingsChannel = supabase
      .channel('meetings-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'meetings' 
      }, async (payload) => {
        console.log('🆕 New meeting created:', payload);
        
        // Fetch the new meeting with attendees and agenda counts
        const { data: newMeeting } = await supabase
          .from("meetings")
          .select(`
            *,
            meeting_attendees(count),
            agenda_items(count)
          `)
          .eq('id', payload.new.id)
          .single();

        if (newMeeting) {
          const enrichedMeeting = {
            ...newMeeting,
            attendee_count: newMeeting.meeting_attendees?.[0]?.count || 0,
            agenda_count: newMeeting.agenda_items?.[0]?.count || 0,
          };
          
          // Add to the beginning of the list immediately
          setMeetings(prev => [enrichedMeeting, ...prev]);
          
          toast({
            title: "Meeting created",
            description: `${newMeeting.title} has been added`,
          });
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'meetings' 
      }, (payload) => {
        console.log('📝 Meeting updated:', payload);
        // Update the specific meeting in state
        setMeetings(prev => 
          prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
        );
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'meetings' 
      }, (payload) => {
        console.log('🗑️ Meeting deleted:', payload);
        // Remove the meeting from state
        setMeetings(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agenda_items' 
      }, () => {
        console.log('📋 Agenda items changed, refreshing...');
        fetchMeetings();
      })
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to meetings updates');
        }
      });

    return () => {
      supabase.removeChannel(meetingsChannel);
    };
  }, [toast]);


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

      // Calculate stats
      const now = new Date();
      const upcoming = enrichedMeetings.filter(m => {
        const startTime = new Date(m.start_time);
        return m.status !== "completed" && startTime > now;
      }).length;
      const inProgress = enrichedMeetings.filter(m => {
        const startTime = new Date(m.start_time);
        const endTime = new Date(m.end_time);
        return now >= startTime && now <= endTime;
      }).length;
      const completed = enrichedMeetings.filter(m => m.status === "completed").length;

      setStats({
        upcoming,
        inProgress,
        completed,
        total: enrichedMeetings.length
      });
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fallback: ensure immediate list update on creation (even if realtime not ready)
  React.useEffect(() => {
    const handler = (e: any) => {
      fetchMeetings();
    };
    window.addEventListener('meeting:created', handler);
    return () => window.removeEventListener('meeting:created', handler);
  }, []);
  
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
    if (!searchQuery) return meetings;
    
    return meetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const upcomingMeetings = filterMeetings(
    meetings.filter((m) => m.status !== "completed").map(formatMeetingCard)
  );
  
  const completedMeetings = filterMeetings(
    meetings.filter((m) => m.status === "completed").map(formatMeetingCard)
  );
  
  const allMeetingsFormatted = filterMeetings(meetings.map(formatMeetingCard));

  // Pagination logic
  const paginateData = (data: any[], currentPage: number) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems: number) => Math.ceil(totalItems / ITEMS_PER_PAGE);

  const paginatedUpcoming = paginateData(upcomingMeetings, currentPageUpcoming);
  const paginatedCompleted = paginateData(completedMeetings, currentPageCompleted);
  const paginatedAll = paginateData(allMeetingsFormatted, currentPageAll);

  const totalPagesUpcoming = getTotalPages(upcomingMeetings.length);
  const totalPagesCompleted = getTotalPages(completedMeetings.length);
  const totalPagesAll = getTotalPages(allMeetingsFormatted.length);

  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <PaginationItem key={page}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return null;
          })}

          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Calendar className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 animate-fade-in">
        {/* Enhanced Header with Stats */}
        <div className={`relative overflow-hidden rounded-2xl lg:rounded-3xl p-6 lg:p-10 border-2 shadow-2xl transition-all duration-500 ${isEthioTelecom ? 'bg-gradient-to-br from-white via-gray-50 to-white border-[#8DC63F]/30' : 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border-purple-500/30'}`}>
          {!isEthioTelecom ? (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 lg:w-96 lg:h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" />
              <div className="absolute bottom-0 left-0 w-64 h-64 lg:w-96 lg:h-96 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" style={{ animationDelay: '1s' }} />
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 lg:w-96 lg:h-96 bg-gradient-to-br from-[#8DC63F]/15 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" />
              <div className="absolute bottom-0 left-0 w-64 h-64 lg:w-96 lg:h-96 bg-gradient-to-tr from-[#0072BC]/15 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" style={{ animationDelay: '1s' }} />
            </>
          )}
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-6">
            <div className="space-y-4 lg:space-y-5 flex-1">
              <div className={`inline-flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full backdrop-blur-sm border-2 shadow-lg transition-all duration-300 hover:scale-105 ${isEthioTelecom ? 'bg-[#8DC63F]/20 border-[#8DC63F]/40' : 'bg-white/20 border-white/30'}`}>
                <Calendar className={`h-4 w-4 lg:h-5 lg:w-5 ${isEthioTelecom ? 'text-[#8DC63F]' : 'text-purple-400'}`} />
                <span className={`text-sm lg:text-base font-semibold ${isEthioTelecom ? 'text-[#8DC63F]' : 'text-white'}`}>
                  Meeting Management
                </span>
              </div>
              
              <h1 className={`text-4xl lg:text-6xl font-black leading-tight animate-fade-in ${isEthioTelecom ? 'font-["Noto_Sans_Ethiopic"] text-gray-900' : 'font-["Space_Grotesk"] text-foreground'}`}>
                Meetings
              </h1>
              
              <p className={`text-base lg:text-xl max-w-2xl leading-relaxed ${isEthioTelecom ? 'text-gray-700' : 'text-muted-foreground'}`}>
                Organize and manage all your meetings in one place
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Upcoming", value: stats.upcoming, icon: Clock, color: isEthioTelecom ? "from-[#0072BC] to-[#005A9C]" : "from-blue-500 to-cyan-500" },
                  { label: "In Progress", value: stats.inProgress, icon: Sparkles, color: isEthioTelecom ? "from-[#8DC63F] to-[#7AB62F]" : "from-purple-500 to-pink-500" },
                  { label: "Completed", value: stats.completed, icon: TrendingUp, color: isEthioTelecom ? "from-[#8DC63F] to-[#0072BC]" : "from-green-500 to-emerald-500" },
                  { label: "Total", value: stats.total, icon: Users, color: isEthioTelecom ? "from-[#0072BC] to-[#8DC63F]" : "from-orange-500 to-red-500" },
                ].map((stat, i) => (
                  <div key={i} className={`p-3 rounded-xl backdrop-blur-sm border ${isEthioTelecom ? 'bg-white/80 border-gray-200' : 'bg-white/10 border-white/20'} hover:scale-105 transition-transform duration-300`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                        <stat.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>{stat.label}</p>
                        <p className={`text-xl font-black ${isEthioTelecom ? 'text-gray-900' : 'text-foreground'}`}>{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <CreateMeetingDialog />
              <InstantMeetingDialog />
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isEthioTelecom ? 'text-gray-400' : 'text-muted-foreground'}`} />
            <Input
              placeholder="Search meetings by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-12 h-12 text-base backdrop-blur-sm border-2 transition-all duration-300 hover:shadow-lg ${isEthioTelecom ? 'bg-white border-gray-200 hover:border-[#8DC63F]/50 focus:border-[#8DC63F]' : 'bg-background/50 hover:border-primary/50 focus:border-primary'}`}
            />
          </div>
          <Button 
            variant="outline" 
            size="lg" 
            className={`gap-2 ${isEthioTelecom ? 'border-2 border-gray-200 hover:bg-gray-100' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Enhanced Meetings Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 h-14 backdrop-blur-sm border-2 ${isEthioTelecom ? 'bg-white border-gray-200' : 'bg-muted/50'}`}>
            <TabsTrigger 
              value="upcoming" 
              className={`font-bold transition-all duration-300 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#0072BC] data-[state=active]:to-[#005A9C] data-[state=active]:text-white' : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white'}`}
            >
              <Clock className="h-4 w-4 mr-2" />
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className={`font-bold transition-all duration-300 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#8DC63F] data-[state=active]:to-[#7AB62F] data-[state=active]:text-white' : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white'}`}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Completed ({completedMeetings.length})
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className={`font-bold transition-all duration-300 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#8DC63F] data-[state=active]:to-[#0072BC] data-[state=active]:text-white' : 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white'}`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              All ({allMeetingsFormatted.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingMeetings.length === 0 ? (
              <Card className={`border-2 border-dashed ${isEthioTelecom ? 'bg-white border-gray-300' : ''}`}>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className={`p-6 rounded-2xl mb-4 ${isEthioTelecom ? 'bg-[#0072BC]/10' : 'bg-blue-500/10'}`}>
                    <Calendar className={`h-16 w-16 ${isEthioTelecom ? 'text-[#0072BC]' : 'text-blue-500'}`} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${isEthioTelecom ? 'text-gray-900' : ''}`}>No Upcoming Meetings</h3>
                  <p className={`${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'} mb-4`}>Get started by creating your first meeting</p>
                  <CreateMeetingDialog />
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
                  {paginatedUpcoming.map((meeting, index) => (
                    <div key={meeting.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-scale-in">
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
                    </div>
                  ))}
                </div>
                {renderPagination(currentPageUpcoming, totalPagesUpcoming, setCurrentPageUpcoming)}
              </>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedMeetings.length === 0 ? (
              <Card className={`border-2 border-dashed ${isEthioTelecom ? 'bg-white border-gray-300' : ''}`}>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className={`p-6 rounded-2xl mb-4 ${isEthioTelecom ? 'bg-[#8DC63F]/10' : 'bg-green-500/10'}`}>
                    <TrendingUp className={`h-16 w-16 ${isEthioTelecom ? 'text-[#8DC63F]' : 'text-green-500'}`} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${isEthioTelecom ? 'text-gray-900' : ''}`}>No Completed Meetings Yet</h3>
                  <p className={`${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>Completed meetings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
                  {paginatedCompleted.map((meeting, index) => (
                    <div key={meeting.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-scale-in">
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
                    </div>
                  ))}
                </div>
                {renderPagination(currentPageCompleted, totalPagesCompleted, setCurrentPageCompleted)}
              </>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
              {paginatedAll.map((meeting, index) => (
                <div key={meeting.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-scale-in">
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
                </div>
              ))}
            </div>
            {renderPagination(currentPageAll, totalPagesAll, setCurrentPageAll)}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
