import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { MeetingCard } from "@/components/MeetingCard";
import { CreateMeetingDialog } from "@/components/CreateMeetingDialog";
import { Calendar, CheckSquare, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  {
    title: "Upcoming Meetings",
    value: "8",
    icon: Calendar,
    trend: { value: "2 this week", positive: true },
    iconColor: "bg-primary/10 text-primary",
  },
  {
    title: "Active Actions",
    value: "24",
    icon: CheckSquare,
    trend: { value: "6 overdue", positive: false },
    iconColor: "bg-secondary/10 text-secondary",
  },
  {
    title: "Hours This Week",
    value: "12.5",
    icon: Clock,
    trend: { value: "+2.5 hrs", positive: true },
    iconColor: "bg-warning/10 text-warning",
  },
  {
    title: "Completion Rate",
    value: "87%",
    icon: TrendingUp,
    trend: { value: "+5%", positive: true },
    iconColor: "bg-success/10 text-success",
  },
];

const upcomingMeetings = [
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
];

const recentActions = [
  { task: "Review Q4 financial projections", assignee: "CFO", deadline: "Dec 18", priority: "high" },
  { task: "Finalize hiring plan for 2025", assignee: "CHRO", deadline: "Dec 20", priority: "medium" },
  { task: "Approve marketing budget", assignee: "CMO", deadline: "Dec 22", priority: "high" },
  { task: "Schedule investor presentations", assignee: "CoS", deadline: "Dec 25", priority: "low" },
];

const priorityVariant = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

const Index = () => {
  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your meeting schedule and action items
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upcoming Meetings */}
          <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Upcoming Meetings</h2>
            <CreateMeetingDialog />
          </div>
            <div className="grid gap-4">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard key={meeting.title} {...meeting} />
              ))}
            </div>
          </div>

          {/* Recent Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Recent Actions</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Track follow-ups from recent meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                    >
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{action.task}</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned to {action.assignee}
                        </p>
                        <p className="text-xs text-muted-foreground">Due: {action.deadline}</p>
                      </div>
                      <Badge variant={priorityVariant[action.priority]} className="shrink-0">
                        {action.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
