import { Layout } from "@/components/Layout";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { format, addMonths, subMonths, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CategoryLegend } from "@/components/calendar/CategoryLegend";
import { CreateCategoryDialog } from "@/components/calendar/CreateCategoryDialog";

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  status: string;
  timezone?: string;
  category_id?: string;
  event_categories?: {
    name: string;
    color_hex: string;
  };
}

interface Category {
  id: string;
  name: string;
  color_hex: string;
  description?: string;
}

const CalendarView = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week">("week");

  useEffect(() => {
    fetchMeetings();
    fetchCategories();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          id,
          title,
          start_time,
          end_time,
          location,
          status,
          timezone,
          category_id,
          event_categories (
            name,
            color_hex
          )
        `)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
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

  const meetingsByDate = meetings.reduce((acc, meeting) => {
    const dateKey = format(new Date(meeting.start_time), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push({
      title: meeting.title,
      time: format(new Date(meeting.start_time), "h:mm a"),
      status: meeting.status,
    });
    return acc;
  }, {} as Record<string, Array<{ title: string; time: string; status: string }>>);

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
        <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
          <TabsList>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="month">Month View</TabsTrigger>
          </TabsList>

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
                    category: m.event_categories
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
                      hasMeetings: "bg-primary/10 font-bold",
                    }}
                  />
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary/10 border border-primary" />
                      <span>Has meetings</span>
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
                            <Card key={index} className="border-l-4 border-l-primary">
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-sm">{meeting.title}</p>
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
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {meeting.time}
                                  </p>
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
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CalendarView;
