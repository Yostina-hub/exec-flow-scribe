import { Layout } from "@/components/Layout";
import { SmartDashboardCard } from "@/components/SmartDashboardCard";
import { QuickActionFAB } from "@/components/QuickActionFAB";
import { InlineMeetingCard } from "@/components/InlineMeetingCard";
import { 
  Calendar, Play, FileText, TrendingUp, Clock, 
  Users, Zap, Target, CheckSquare 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const upcomingMeetings = [
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
];

const recentActions = [
  { task: "Review Q4 financial projections", assignee: "CFO", deadline: "Today", priority: "high", progress: 75 },
  { task: "Finalize hiring plan for 2025", assignee: "CHRO", deadline: "Tomorrow", priority: "medium", progress: 45 },
  { task: "Approve marketing budget", assignee: "CMO", deadline: "Dec 22", priority: "high", progress: 90 },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 animate-fade-in">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Welcome Back! 👋</h1>
            <p className="text-lg text-muted-foreground">
              You have 2 meetings today and 3 pending actions
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {/* Smart Quick Action Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SmartDashboardCard
            title="Today's Meetings"
            description="2 meetings scheduled"
            icon={Calendar}
            gradient="from-blue-500/10 to-blue-500/5"
            stats={[
              { label: "Next meeting", value: "2:00 PM" },
              { label: "Total duration", value: "3.5h" },
            ]}
            actions={[
              { 
                label: "Start Now", 
                onClick: () => navigate('/meetings/1b09fe77-8677-4ac1-9d7e-34b6016b6ab9'),
                icon: Play,
              },
              { 
                label: "View All", 
                onClick: () => navigate('/meetings'),
                variant: 'outline',
                icon: Calendar,
              },
            ]}
          />

          <SmartDashboardCard
            title="Action Items"
            description="3 items due this week"
            icon={Target}
            gradient="from-green-500/10 to-green-500/5"
            stats={[
              { label: "Completed", value: "87%", trend: 'up' },
              { label: "Overdue", value: "0" },
            ]}
            actions={[
              { 
                label: "Quick Add", 
                onClick: () => navigate('/actions'),
                icon: Zap,
              },
              { 
                label: "View Tasks", 
                onClick: () => navigate('/actions'),
                variant: 'outline',
                icon: CheckSquare,
              },
            ]}
          />

          <SmartDashboardCard
            title="Meeting Insights"
            description="This week's analytics"
            icon={TrendingUp}
            gradient="from-purple-500/10 to-purple-500/5"
            stats={[
              { label: "Hours spent", value: "12.5", trend: 'up' },
              { label: "Efficiency", value: "+15%" },
            ]}
            actions={[
              { 
                label: "View Report", 
                onClick: () => navigate('/analytics'),
                icon: FileText,
              },
              { 
                label: "Details", 
                onClick: () => navigate('/reports'),
                variant: 'outline',
              },
            ]}
          />
        </div>

        {/* Today's Meetings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Today's Meetings</h2>
              <p className="text-sm text-muted-foreground">Quick access to your scheduled meetings</p>
            </div>
          </div>
          
          <div className="grid gap-3">
            {upcomingMeetings.map((meeting) => (
              <InlineMeetingCard key={meeting.id} {...meeting} />
            ))}
          </div>
        </div>

        {/* Active Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Active Actions</h2>
              <p className="text-sm text-muted-foreground">Track your high-priority tasks</p>
            </div>
          </div>

          <div className="grid gap-3">
            {recentActions.map((action, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.01]"
                onClick={() => navigate('/actions')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {action.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {action.deadline}
                        </span>
                      </div>
                      
                      <p className="font-medium">{action.task}</p>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{action.assignee}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Progress value={action.progress} className="h-1.5" />
                            <span className="text-xs text-muted-foreground">{action.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <QuickActionFAB />
    </Layout>
  );
}
