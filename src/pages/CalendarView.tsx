import { Layout } from "@/components/Layout";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Bell, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
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

  useEffect(() => {
    fetchMeetings();
    fetchCategories();
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
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Executive Calendar</h1>
            <p className="text-muted-foreground mt-2">
              CEO monthly schedule with executives
            </p>
          </div>
          <div className="flex gap-2">
            <CreateCategoryDialog onCategoryCreated={fetchCategories} />
            <CreateMeetingDialog />
          </div>
        </div>

        {/* Calendar Views */}
        <Tabs value={view} onValueChange={(v) => setView(v as "day" | "week" | "month")}>
          <TabsList>
            <TabsTrigger value="day">Day View</TabsTrigger>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="month">Month View</TabsTrigger>
          </TabsList>

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
              {/* Calendar */}
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">
                      {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousMonth}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextMonth}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className="rounded-md border"
                    modifiers={{
                      hasMeetings: datesWithMeetings,
                    }}
                    modifiersClassNames={{
                      hasMeetings: "bg-gradient-to-br from-purple-500/20 to-blue-500/20 font-bold border-2 border-purple-500/30",
                    }}
                  />
                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 border-2 border-purple-500/50" />
                      <span className="text-muted-foreground">Has meetings</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(237 83% 28%)' }} />
                      <span className="text-muted-foreground">Scheduled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(38 92% 50%)' }} />
                      <span className="text-muted-foreground">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(142 71% 45%)' }} />
                      <span className="text-muted-foreground">Completed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Day Details */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {selectedDate
                            ? format(selectedDate, "EEEE, MMMM d, yyyy")
                            : "Select a date"}
                        </span>
                      </div>

                      {selectedMeetings.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">
                            {selectedMeetings.length}{" "}
                            {selectedMeetings.length === 1 ? "meeting" : "meetings"} scheduled
                          </p>
                          {selectedMeetings.map((meeting, index) => (
                            <Card 
                              key={`${meeting.id}-${meeting.start_time}`} 
                              className="border-l-4 hover:shadow-md transition-shadow cursor-pointer"
                              style={{ 
                                borderLeftColor: meeting.event_categories?.color_hex || 
                                  (meeting.status === 'completed' ? '#10b981' : 
                                   meeting.status === 'in-progress' ? '#f59e0b' : '#3b82f6')
                              }}
                              onClick={() => navigate(`/meetings/${meeting.id}`)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-sm hover:text-primary transition-colors">
                                          {meeting.title}
                                        </p>
                                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                        {meeting.is_recurring && (
                                          <Badge variant="outline" className="text-xs">Recurring</Badge>
                                        )}
                                        {meeting.is_exception && (
                                          <Badge variant="outline" className="text-xs">Modified</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(meeting.start_time), "h:mm a")} - {format(new Date(meeting.end_time), "h:mm a")}
                                      </p>
                                      {meeting.location && (
                                        <p className="text-xs text-muted-foreground truncate">{meeting.location}</p>
                                      )}
                                      {meeting.event_categories && (
                                        <Badge 
                                          variant="outline" 
                                          className="text-xs mt-1"
                                          style={{ borderColor: meeting.event_categories.color_hex }}
                                        >
                                          {meeting.event_categories.name}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2 items-end" onClick={(e) => e.stopPropagation()}>
                                      <Badge
                                        variant={
                                          meeting.status === "completed"
                                            ? "success"
                                            : "secondary"
                                        }
                                        className="shrink-0 text-xs"
                                      >
                                        {meeting.status}
                                      </Badge>
                                       <EventRSVPControls
                                        meetingId={meeting.id}
                                        currentStatus={meeting.user_response_status || 'none'}
                                        onStatusChange={fetchMeetings}
                                      />
                                       <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMeetingForNotifications(meeting);
                                          }}
                                        >
                                          <Bell className="h-4 w-4" />
                                        </Button>
                                        {meeting.is_recurring && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedMeetingForException(meeting);
                                            }}
                                          >
                                            Edit
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
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
    </Layout>
  );
};

export default CalendarView;
