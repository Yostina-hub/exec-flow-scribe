import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, Users, Calendar, BarChart3, Download, Filter, RefreshCw, Sparkles } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useState } from "react";

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
  const [timeRange, setTimeRange] = useState("6months");
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
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
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Select value={timeRange} onValueChange={setTimeRange}>
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
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        {/* AI Insights Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>AI-Powered Insights</CardTitle>
                <CardDescription>Key observations from your meeting data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-background/50 border">
                <p className="text-sm">📈 Meeting volume increased by 12% this quarter - consider optimizing schedule</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <p className="text-sm">⚡ Action completion rate improved by 5% - great team momentum!</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border">
                <p className="text-sm">👥 Average attendance slightly decreased - review meeting relevance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <Tabs defaultValue="trends" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="types" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Types</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Actions</span>
            </TabsTrigger>
          </TabsList>

          {/* Meeting Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card className="border-2 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Meeting Activity Over Time</CardTitle>
                    <CardDescription>
                      Monthly meeting count and total hours spent
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={meetingTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="meetings"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      name="Meetings"
                      dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="hours"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={3}
                      name="Hours"
                      dot={{ fill: 'hsl(var(--secondary))', r: 5 }}
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
  );
};

export default Analytics;
