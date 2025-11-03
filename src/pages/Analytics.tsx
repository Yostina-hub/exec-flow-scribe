import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, Users, Calendar, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/StatCard";

const meetingTrendData = [
  { month: "Jul", meetings: 12, hours: 18 },
  { month: "Aug", meetings: 15, hours: 22.5 },
  { month: "Sep", meetings: 18, hours: 27 },
  { month: "Oct", meetings: 16, hours: 24 },
  { month: "Nov", meetings: 20, hours: 30 },
  { month: "Dec", meetings: 18, hours: 27.5 },
];

const attendanceData = [
  { name: "CEO", meetings: 18, hours: 27.5 },
  { name: "CFO", meetings: 16, hours: 24 },
  { name: "CHRO", meetings: 12, hours: 18 },
  { name: "CMO", meetings: 10, hours: 15 },
  { name: "CPO", meetings: 14, hours: 21 },
  { name: "CTO", meetings: 13, hours: 19.5 },
];

const meetingTypeData = [
  { name: "Strategy", value: 30, color: "hsl(var(--primary))" },
  { name: "Operations", value: 25, color: "hsl(var(--secondary))" },
  { name: "Planning", value: 20, color: "hsl(var(--accent))" },
  { name: "Review", value: 15, color: "hsl(var(--success))" },
  { name: "Other", value: 10, color: "hsl(var(--muted))" },
];

const actionCompletionData = [
  { week: "Week 1", completed: 8, pending: 4 },
  { week: "Week 2", completed: 12, pending: 6 },
  { week: "Week 3", completed: 10, pending: 5 },
  { week: "Week 4", completed: 15, pending: 3 },
];

const stats = [
  {
    title: "Total Meetings",
    value: "118",
    icon: Calendar,
    trend: { value: "+12% from last quarter", positive: true },
    iconColor: "bg-primary/10 text-primary",
  },
  {
    title: "Total Hours",
    value: "177",
    icon: Clock,
    trend: { value: "+8% from last quarter", positive: true },
    iconColor: "bg-secondary/10 text-secondary",
  },
  {
    title: "Avg. Attendance",
    value: "7.5",
    icon: Users,
    trend: { value: "-0.5 from last quarter", positive: false },
    iconColor: "bg-warning/10 text-warning",
  },
  {
    title: "Completion Rate",
    value: "87%",
    icon: TrendingUp,
    trend: { value: "+5% from last quarter", positive: true },
    iconColor: "bg-success/10 text-success",
  },
];

const Analytics = () => {
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Executive Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-pink-500/10 p-8 border border-purple-500/20 animate-fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium">Executive Analytics</span>
              </div>
              <h1 className="text-5xl font-black font-['Space_Grotesk']">Analytics</h1>
              <p className="text-muted-foreground text-lg">Real-time insights and performance metrics</p>
            </div>
            <Select defaultValue="6months">
              <SelectTrigger className="w-[200px] h-11 border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Meeting Trends</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="types">Meeting Types</TabsTrigger>
            <TabsTrigger value="actions">Action Items</TabsTrigger>
          </TabsList>

          {/* Meeting Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Activity Over Time</CardTitle>
                <CardDescription>
                  Monthly meeting count and total hours spent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={meetingTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="meetings"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Meetings"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="hours"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      name="Hours"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Executive Attendance</CardTitle>
                <CardDescription>
                  Meeting participation by executive team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="meetings" fill="hsl(var(--primary))" name="Meetings" />
                    <Bar dataKey="hours" fill="hsl(var(--secondary))" name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meeting Types Tab */}
          <TabsContent value="types" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Meeting Distribution</CardTitle>
                  <CardDescription>
                    Breakdown by meeting category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={meetingTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {meetingTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>
                    Detailed statistics by type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {meetingTypeData.map((type) => (
                      <div key={type.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span className="font-medium">{type.name}</span>
                          </div>
                          <span className="text-muted-foreground">
                            {type.value} meetings
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${type.value}%`,
                              backgroundColor: type.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Action Item Completion</CardTitle>
                <CardDescription>
                  Weekly completion rate and pending items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={actionCompletionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="completed"
                      fill="hsl(var(--success))"
                      name="Completed"
                      stackId="a"
                    />
                    <Bar
                      dataKey="pending"
                      fill="hsl(var(--warning))"
                      name="Pending"
                      stackId="a"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Analytics;
