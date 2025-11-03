import { Layout } from "@/components/Layout";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { InstantMeetingDialog } from "@/components/InstantMeetingDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Calendar, Plus } from "lucide-react";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentPageUpcoming, setCurrentPageUpcoming] = React.useState(1);
  const [currentPageCompleted, setCurrentPageCompleted] = React.useState(1);
  const [currentPageAll, setCurrentPageAll] = React.useState(1);

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
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
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
      <div className="space-y-6 pb-20">
        {/* Executive Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 p-8 border border-blue-500/20 animate-fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">Meeting Management</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-black font-['Space_Grotesk']">
                Meetings
              </h1>
              
              <p className="text-muted-foreground text-lg">
                {upcomingMeetings.length} upcoming · {completedMeetings.length} completed · {allMeetingsFormatted.length} total
              </p>
            </div>
            
            <div className="flex gap-2">
              <CreateMeetingDialog />
              <InstantMeetingDialog />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search meetings by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base bg-background/50 backdrop-blur-sm border-2 hover:border-primary/50 transition-colors"
          />
        </div>

        {/* Meetings Tabs - Executive Style */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 backdrop-blur-sm border-2">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white font-semibold">
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white font-semibold">
              Completed ({completedMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-semibold">
              All ({allMeetingsFormatted.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {upcomingMeetings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming meetings</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginatedUpcoming.map((meeting) => (
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
                {renderPagination(currentPageUpcoming, totalPagesUpcoming, setCurrentPageUpcoming)}
              </>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedMeetings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed meetings yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginatedCompleted.map((meeting) => (
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
                {renderPagination(currentPageCompleted, totalPagesCompleted, setCurrentPageCompleted)}
              </>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedAll.map((meeting) => (
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
            {renderPagination(currentPageAll, totalPagesAll, setCurrentPageAll)}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
