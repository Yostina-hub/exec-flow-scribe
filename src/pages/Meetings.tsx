import { Layout } from "@/components/Layout";
import { MeetingCard } from "@/components/MeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

const allMeetings = [
  {
    title: "Executive Strategy Review",
    date: "Today",
    time: "2:00 PM",
    duration: "90 min",
    location: "Board Room",
    attendees: 8,
    status: "upcoming" as const,
    agendaItems: 6,
  },
  {
    title: "Weekly Operations Sync",
    date: "Today",
    time: "4:30 PM",
    duration: "45 min",
    location: "Conference Room B",
    attendees: 5,
    status: "upcoming" as const,
    agendaItems: 3,
  },
  {
    title: "Quarterly Planning Session",
    date: "Tomorrow",
    time: "10:00 AM",
    duration: "120 min",
    location: "Conference Room A",
    attendees: 12,
    status: "upcoming" as const,
    agendaItems: 8,
  },
  {
    title: "Product Roadmap Discussion",
    date: "Dec 20",
    time: "3:00 PM",
    duration: "60 min",
    location: "Virtual",
    attendees: 6,
    status: "upcoming" as const,
    agendaItems: 4,
  },
  {
    title: "Leadership Team Meeting",
    date: "Dec 16",
    time: "1:00 PM",
    duration: "120 min",
    location: "Board Room",
    attendees: 10,
    status: "completed" as const,
    agendaItems: 7,
  },
  {
    title: "Investor Relations Call",
    date: "Dec 15",
    time: "11:00 AM",
    duration: "60 min",
    location: "Virtual",
    attendees: 4,
    status: "completed" as const,
    agendaItems: 5,
  },
  {
    title: "Budget Review Meeting",
    date: "Dec 14",
    time: "2:00 PM",
    duration: "90 min",
    location: "Conference Room A",
    attendees: 8,
    status: "completed" as const,
    agendaItems: 6,
  },
];

const Meetings = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const upcomingMeetings = allMeetings.filter((m) => m.status === "upcoming");
  const completedMeetings = allMeetings.filter((m) => m.status === "completed");

  const filterMeetings = (meetings: typeof allMeetings) => {
    if (!searchQuery) return meetings;
    return meetings.filter((m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Meetings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your executive meeting schedule
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Sync Calendar
            </Button>
            <CreateMeetingDialog />
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedMeetings.length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({allMeetings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {filterMeetings(upcomingMeetings).map((meeting) => (
                <MeetingCard key={meeting.title} {...meeting} />
              ))}
            </div>
            {filterMeetings(upcomingMeetings).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No upcoming meetings found
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {filterMeetings(completedMeetings).map((meeting) => (
                <MeetingCard key={meeting.title} {...meeting} />
              ))}
            </div>
            {filterMeetings(completedMeetings).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No completed meetings found
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {filterMeetings(allMeetings).map((meeting) => (
                <MeetingCard key={meeting.title} {...meeting} />
              ))}
            </div>
            {filterMeetings(allMeetings).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No meetings found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Meetings;
