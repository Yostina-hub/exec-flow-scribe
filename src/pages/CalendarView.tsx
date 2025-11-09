import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Bell, ExternalLink, Plus, Filter, Sparkles, Users, Clock, MapPin, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isToday, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CategoryLegend } from "@/components/calendar/CategoryLegend";
import { CreateCategoryDialog } from "@/components/calendar/CreateCategoryDialog";
import { EventRSVPControls } from "@/components/calendar/EventRSVPControls";
import { EventNotificationSettings } from "@/components/calendar/EventNotificationSettings";
import { CreateEventExceptionDialog } from "@/components/calendar/CreateEventExceptionDialog";
import { generateRecurrenceInstances } from "@/utils/recurrenceUtils";
import { useTheme } from "@/contexts/ThemeContext";

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  description?: string;
  status: string;
  timezone?: string;
  category_id?: string;
  is_recurring?: boolean;
  event_categories?: {
    name: string;
    color_hex: string;
  };
  recurrence_rules?: any[];
  event_exceptions?: any[];
  user_response_status?: string;
  is_exception?: boolean;
  meeting_attendees?: any[];
  attendee_count?: number;
}

interface Category {
  id: string;
  name: string;
  color_hex: string;
  description?: string;
}

const CalendarView = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedMeetingForNotifications, setSelectedMeetingForNotifications] = useState<Meeting | null>(null);
  const [selectedMeetingForException, setSelectedMeetingForException] = useState<Meeting | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0, thisMonth: 0 });

  useEffect(() => {
    fetchMeetings();
    fetchCategories();

    // Real-time updates
    const channel = supabase
      .channel('calendar-meetings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchMeetings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data: meetingsData, error } = await supabase
        .from("meetings")
        .select(`
          *,
          event_categories (
            name,
            color_hex
          ),
          recurrence_rules (*),
          event_exceptions (*),
          meeting_attendees (user_id, response_status)
        `)
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Get current user for RSVP status
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Add attendee status and count for each meeting
        const meetingsWithAttendees = (meetingsData || []).map((meeting) => {
          const userAttendee = meeting.meeting_attendees?.find(
            (a: any) => a.user_id === user.id
          );

          return {
            ...meeting,
            user_response_status: userAttendee?.response_status || 'none',
            attendee_count: meeting.meeting_attendees?.length || 0
          };
        });
        setMeetings(meetingsWithAttendees);

        // Calculate stats
        const now = new Date();
        const todayMeetings = meetingsWithAttendees.filter(m => isToday(new Date(m.start_time)));
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const thisWeekMeetings = meetingsWithAttendees.filter(m => {
          const meetingDate = new Date(m.start_time);
          return meetingDate >= weekStart && meetingDate <= weekEnd;
        });
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const thisMonthMeetings = meetingsWithAttendees.filter(m => {
          const meetingDate = new Date(m.start_time);
          return meetingDate >= monthStart && meetingDate <= monthEnd;
        });

        setStats({
          total: meetingsWithAttendees.length,
          today: todayMeetings.length,
          thisWeek: thisWeekMeetings.length,
          thisMonth: thisMonthMeetings.length
        });
      } else {
        setMeetings(meetingsData || []);
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("event_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  // Generate all event instances including recurring ones
  const allEventInstances = meetings.flatMap(meeting => {
    if (meeting.is_recurring && meeting.recurrence_rules?.[0]) {
      const rangeStart = startOfMonth(currentMonth);
      const rangeEnd = endOfMonth(currentMonth);
      
      const instances = generateRecurrenceInstances(
        {
          id: meeting.id,
          start_time: meeting.start_time,
          end_time: meeting.end_time,
          recurrence_rule: meeting.recurrence_rules[0],
          exceptions: meeting.event_exceptions || []
        },
        rangeStart,
        rangeEnd
      );

      return instances.map(instance => ({
        ...meeting,
        start_time: instance.start.toISOString(),
        end_time: instance.end.toISOString(),
        location: instance.overrides?.override_location || meeting.location,
        description: instance.overrides?.override_description || meeting.description,
        is_exception: instance.isException
      }));
    }
    return [meeting];
  });

  const meetingsByDate = allEventInstances.reduce((acc, meeting) => {
    const dateKey = format(new Date(meeting.start_time), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const selectedMeetings = meetingsByDate[selectedDateKey] || [];

  const datesWithMeetings = Object.keys(meetingsByDate).map(
    (dateStr) => new Date(dateStr)
  );

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        {/* Enhanced Header with Stats */}
        <div className={`relative overflow-hidden rounded-2xl lg:rounded-3xl p-6 lg:p-8 border-2 shadow-2xl ${isEthioTelecom ? 'bg-gradient-to-br from-white via-gray-50 to-white border-[#8DC63F]/30' : 'bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border-purple-500/30'}`}>
          {!isEthioTelecom ? (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" style={{ animationDelay: '1s' }} />
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#8DC63F]/15 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#0072BC]/15 to-transparent rounded-full blur-3xl animate-pulse hidden lg:block" style={{ animationDelay: '1s' }} />
            </>
          )}

          <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border-2 shadow-lg ${isEthioTelecom ? 'bg-[#8DC63F]/20 border-[#8DC63F]/40' : 'bg-white/20 border-white/30'}`}>
                <CalendarIcon className={`h-5 w-5 ${isEthioTelecom ? 'text-[#8DC63F]' : 'text-purple-400'}`} />
                <span className={`text-sm font-semibold ${isEthioTelecom ? 'text-[#8DC63F]' : 'text-white'}`}>Executive Calendar</span>
              </div>
              
              <h1 className={`text-4xl lg:text-5xl font-black leading-tight ${isEthioTelecom ? 'font-["Noto_Sans_Ethiopic"] text-gray-900' : 'font-["Space_Grotesk"] text-foreground'}`}>
                Your Schedule
              </h1>
              
              <p className={`text-base lg:text-lg max-w-2xl ${isEthioTelecom ? 'text-gray-700' : 'text-muted-foreground'}`}>
                Manage meetings, events, and stay organized with your executive calendar
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Today", value: stats.today, icon: Clock, color: isEthioTelecom ? "from-[#8DC63F] to-[#7AB62F]" : "from-blue-500 to-cyan-500" },
                  { label: "This Week", value: stats.thisWeek, icon: TrendingUp, color: isEthioTelecom ? "from-[#0072BC] to-[#005A9C]" : "from-purple-500 to-pink-500" },
                  { label: "This Month", value: stats.thisMonth, icon: CalendarIcon, color: isEthioTelecom ? "from-[#8DC63F] to-[#0072BC]" : "from-green-500 to-emerald-500" },
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
              <CreateCategoryDialog onCategoryCreated={fetchCategories} />
              <CreateMeetingDialog />
            </div>
          </div>
        </div>

        {/* Enhanced Calendar Views */}
        <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week" | "month")} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className={`${isEthioTelecom ? 'bg-white border-2 border-gray-200' : 'bg-muted/50'}`}>
              <TabsTrigger value="day" className={isEthioTelecom ? 'data-[state=active]:bg-[#8DC63F] data-[state=active]:text-white' : ''}>
                <Clock className="h-4 w-4 mr-2" />
                Day View
              </TabsTrigger>
              <TabsTrigger value="week" className={isEthioTelecom ? 'data-[state=active]:bg-[#8DC63F] data-[state=active]:text-white' : ''}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Week View
              </TabsTrigger>
              <TabsTrigger value="month" className={isEthioTelecom ? 'data-[state=active]:bg-[#8DC63F] data-[state=active]:text-white' : ''}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Month View
              </TabsTrigger>
            </TabsList>

            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          <TabsContent value="day" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <CalendarDayView
                  events={meetings.map(m => ({
                    id: m.id,
                    title: m.title,
                    start_time: m.start_time,
                    end_time: m.end_time,
                    location: m.location,
                    timezone: m.timezone,
                    status: m.status,
                    category: m.event_categories,
                    attendee_count: m.attendee_count
                  }))}
                  currentDay={currentDay}
                  onDayChange={setCurrentDay}
                  timezone="Africa/Addis_Ababa"
                />
              </div>
              <div className="space-y-4">
                <CategoryLegend
                  categories={categories}
                  onAddCategory={fetchCategories}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="week" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <CalendarWeekView
                  events={meetings.map(m => ({
                    id: m.id,
                    title: m.title,
                    start_time: m.start_time,
                    end_time: m.end_time,
                    location: m.location,
                    timezone: m.timezone,
                    status: m.status,
                    category: m.event_categories,
                    attendee_count: m.attendee_count
                  }))}
                  currentWeek={currentWeek}
                  onWeekChange={setCurrentWeek}
                  timezone="Africa/Addis_Ababa"
                />
              </div>
              <div className="space-y-4">
                <CategoryLegend
                  categories={categories}
                  onAddCategory={fetchCategories}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="month" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Enhanced Calendar */}
              <Card className={`lg:col-span-2 border-2 overflow-hidden transition-all duration-500 hover:shadow-2xl ${isEthioTelecom ? 'bg-white border-gray-200 hover:border-[#8DC63F]/50' : 'bg-gradient-to-br from-background via-muted/20 to-background border-border/50 hover:border-primary/50 backdrop-blur-xl'}`}>
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl shadow-2xl ${isEthioTelecom ? 'bg-gradient-to-br from-[#8DC63F] to-[#7AB62F]' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                        <CalendarIcon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className={`text-2xl font-black ${isEthioTelecom ? 'font-["Noto_Sans_Ethiopic"] text-gray-900' : 'font-["Space_Grotesk"]'}`}>
                        {format(currentMonth, "MMMM yyyy")}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousMonth}
                        className="hover:scale-110 transition-transform"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextMonth}
                        className="hover:scale-110 transition-transform"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className={`rounded-md border-0 pointer-events-auto ${isEthioTelecom ? 'text-gray-900' : ''}`}
                    modifiers={{
                      hasMeetings: datesWithMeetings,
                      today: [new Date()],
                    }}
                    modifiersClassNames={{
                      hasMeetings: isEthioTelecom 
                        ? "bg-gradient-to-br from-[#8DC63F]/20 to-[#0072BC]/20 font-bold border-2 border-[#8DC63F]/50"
                        : "bg-gradient-to-br from-purple-500/20 to-blue-500/20 font-bold border-2 border-purple-500/30",
                      today: isEthioTelecom
                        ? "bg-[#8DC63F] text-white font-black"
                        : "bg-primary text-primary-foreground font-black",
                    }}
                  />
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/50 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${isEthioTelecom ? 'bg-gradient-to-br from-[#8DC63F]/40 to-[#0072BC]/40 border-2 border-[#8DC63F]/50' : 'bg-gradient-to-br from-purple-500/40 to-blue-500/40 border-2 border-purple-500/50'}`} />
                      <span className={`${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>Has meetings</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(237 83% 28%)' }} />
                      <span className={`${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>Scheduled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(38 92% 50%)' }} />
                      <span className={`${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(142 71% 45%)' }} />
                      <span className={`${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>Completed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Selected Day Details */}
              <div className="space-y-4">
                <Card className={`border-2 overflow-hidden transition-all duration-500 hover:shadow-2xl ${isEthioTelecom ? 'bg-white border-gray-200 hover:border-[#0072BC]/50' : 'bg-gradient-to-br from-background via-muted/20 to-background border-border/50 hover:border-primary/50 backdrop-blur-xl'}`}>
                  <CardHeader className="border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl shadow-2xl ${isEthioTelecom ? 'bg-gradient-to-br from-[#0072BC] to-[#005A9C]' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                        <CalendarIcon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle className={`text-xl font-black ${isEthioTelecom ? 'font-["Noto_Sans_Ethiopic"] text-gray-900' : 'font-["Space_Grotesk"]'}`}>
                        Selected Day
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 ${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>
                        <CalendarIcon className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          {selectedDate
                            ? format(selectedDate, "EEEE, MMMM d")
                            : "Select a date"}
                        </span>
                      </div>

                      {selectedMeetings.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-bold ${isEthioTelecom ? 'text-gray-900' : ''}`}>
                              {selectedMeetings.length} {selectedMeetings.length === 1 ? "Meeting" : "Meetings"}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {selectedMeetings.length}
                            </Badge>
                          </div>
                          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {selectedMeetings.map((meeting) => (
                              <Card 
                                key={`${meeting.id}-${meeting.start_time}`} 
                                className={`border-l-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isEthioTelecom ? 'hover:border-[#8DC63F]/70 bg-white' : 'hover:shadow-primary/20'}`}
                                style={{ 
                                  borderLeftColor: meeting.event_categories?.color_hex || 
                                    (meeting.status === 'completed' ? '#10b981' : 
                                     meeting.status === 'in-progress' ? '#f59e0b' : '#3b82f6')
                                }}
                                onClick={() => navigate(`/meetings/${meeting.id}`)}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                          <p className={`font-bold text-sm ${isEthioTelecom ? 'text-gray-900' : ''} hover:text-primary transition-colors line-clamp-1`}>
                                            {meeting.title}
                                          </p>
                                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                          <Clock className="h-3 w-3" />
                                          <span>{format(new Date(meeting.start_time), "h:mm a")} - {format(new Date(meeting.end_time), "h:mm a")}</span>
                                        </div>
                                        
                                        {meeting.location && (
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                            <MapPin className="h-3 w-3" />
                                            <span className="truncate">{meeting.location}</span>
                                          </div>
                                        )}
                                        
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
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
                                          {meeting.is_recurring && (
                                            <Badge variant="outline" className="text-xs">Recurring</Badge>
                                          )}
                                          {meeting.is_exception && (
                                            <Badge variant="outline" className="text-xs">Modified</Badge>
                                          )}
                                          {meeting.attendee_count > 0 && (
                                            <Badge variant="secondary" className="text-xs gap-1">
                                              <Users className="h-3 w-3" />
                                              {meeting.attendee_count}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-2 items-end shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <Badge
                                          variant={meeting.status === "completed" ? "success" : "secondary"}
                                          className="text-xs"
                                        >
                                          {meeting.status}
                                        </Badge>
                                        <EventRSVPControls
                                          meetingId={meeting.id}
                                          currentStatus={meeting.user_response_status || 'none'}
                                          onStatusChange={fetchMeetings}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CalendarIcon className={`h-12 w-12 mx-auto mb-2 ${isEthioTelecom ? 'text-gray-400' : 'text-muted-foreground'}`} />
                          <p className={`text-sm ${isEthioTelecom ? 'text-gray-600' : 'text-muted-foreground'}`}>
                            No meetings scheduled for this day
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <CategoryLegend
                  categories={categories}
                  onAddCategory={fetchCategories}
                />

                {selectedMeetingForNotifications && (
                  <EventNotificationSettings
                    meetingId={selectedMeetingForNotifications.id}
                    meetingTitle={selectedMeetingForNotifications.title}
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Exception Dialog */}
        {selectedMeetingForException && (
          <CreateEventExceptionDialog
            open={!!selectedMeetingForException}
            onOpenChange={(open) => !open && setSelectedMeetingForException(null)}
            meetingId={selectedMeetingForException.id}
            exceptionDate={new Date(selectedMeetingForException.start_time)}
            originalStartTime={selectedMeetingForException.start_time}
            originalEndTime={selectedMeetingForException.end_time}
            originalLocation={selectedMeetingForException.location}
            originalDescription={selectedMeetingForException.description}
            onSuccess={fetchMeetings}
          />
        )}
      </div>
  );
};

export default CalendarView;
