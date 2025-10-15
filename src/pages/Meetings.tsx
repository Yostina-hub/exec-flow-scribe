import { Layout } from "@/components/Layout";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter } from "lucide-react";
import { useState } from "react";

const allMeetings = [
  {
    id: "1b09fe77-8677-4ac1-9d7e-34b6016b6ab9",
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
    id: "2c19fe88-9788-5bc2-ae8f-45c7027c7bca",
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
    id: "3d29fe99-a899-6cd3-bf9g-56d8138d8cdb",
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
    id: "4e39fea0-ba90-7de4-cg0h-67e9249e9dec",
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
    id: "5f49feb1-cb01-8ef5-dh1i-78fa35af0efd",
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
    id: "6g59fec2-dc12-9fg6-ei2j-89gb46bg1fge",
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
    id: "7h69fed3-ed23-0gh7-fj3k-90hc57ch2ghf",
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

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");

  const filterMeetings = (meetings: typeof allMeetings) => {
    if (!searchQuery) return meetings;
    return meetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const upcomingMeetings = allMeetings.filter((m) => m.status === "upcoming");
  const completedMeetings = allMeetings.filter((m) => m.status === "completed");

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
              <TabsTrigger value="all">All ({allMeetings.length})</TabsTrigger>
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
              {filterMeetings(allMeetings).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No meetings found
                </div>
              ) : (
                filterMeetings(allMeetings).map((meeting) => (
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
