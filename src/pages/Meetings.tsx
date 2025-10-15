import { Layout } from "@/components/Layout";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
}

interface FormattedMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  attendees: number;
  status: "completed" | "upcoming";
  agendaItems: number;
}

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;
      setMeetings(data || []);
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
    
    return {
      id: meeting.id,
      title: meeting.title,
      date: format(startTime, "MMM d"),
      time: format(startTime, "h:mm a"),
      duration: `${duration} min`,
      location: meeting.location || "TBD",
      attendees: 0,
      status: meeting.status === "completed" ? "completed" as const : "upcoming" as const,
      agendaItems: 0,
    };
  };

  const filterMeetings = (meetings: FormattedMeeting[]) => {
    if (!searchQuery) return meetings;
    return meetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const upcomingMeetings = meetings.filter((m) => m.status !== "completed").map(formatMeetingCard);
  const completedMeetings = meetings.filter((m) => m.status === "completed").map(formatMeetingCard);
  const allMeetingsFormatted = meetings.map(formatMeetingCard);

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
      <div className="space-y-6 pb-20">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Meetings</h1>
              <p className="text-muted-foreground">Manage your meetings effortlessly</p>
            </div>
            <CreateMeetingDialog />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedMeetings.length})</TabsTrigger>
              <TabsTrigger value="all">All ({allMeetingsFormatted.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3 mt-6">
              {filterMeetings(upcomingMeetings).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No upcoming meetings found
                </div>
              ) : (
                filterMeetings(upcomingMeetings).map((meeting) => (
                  <InlineMeetingCard key={meeting.id} {...meeting} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-6">
              {filterMeetings(completedMeetings).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No completed meetings found
                </div>
              ) : (
                filterMeetings(completedMeetings).map((meeting) => (
                  <InlineMeetingCard key={meeting.id} {...meeting} />
                ))
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-3 mt-6">
              {filterMeetings(allMeetingsFormatted).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No meetings found
                </div>
              ) : (
                filterMeetings(allMeetingsFormatted).map((meeting) => (
                  <InlineMeetingCard key={meeting.id} {...meeting} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <QuickActionFAB />
    </Layout>
  );
}
