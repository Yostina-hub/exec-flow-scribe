import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Calendar, Target, Users, Clock, 
  Activity, CheckCircle2, AlertCircle, Zap, ArrowRight, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ExecutiveDashboardProps {
  meetings: any[];
  actions: any[];
  completionRate: number;
  totalActions: number;
  loading: boolean;
}

export const ExecutiveDashboard = ({ 
  meetings, 
  actions, 
  completionRate,
  totalActions,
  loading 
}: ExecutiveDashboardProps) => {
  const navigate = useNavigate();

  // Calculate executive KPIs
  const todayMeetings = meetings.length;
  const upcomingMeetings = meetings.filter(m => new Date(m.start_time) > new Date()).length;
  const completedToday = meetings.filter(m => m.status === 'completed').length;
  const urgentActions = actions.filter(a => {
    const daysUntilDue = Math.floor((new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 2;
  }).length;

  const kpis = [
    {
      title: "Today's Meetings",
      value: todayMeetings,
      change: "+12%",
      trend: "up",
      icon: Calendar,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/5"
    },
    {
      title: "Completion Rate",
      value: `${completionRate}%`,
      change: "+8%",
      trend: "up",
      icon: Target,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/5"
    },
    {
      title: "Urgent Actions",
      value: urgentActions,
      change: "-3",
      trend: "down",
      icon: AlertCircle,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/5"
    },
    {
      title: "Team Productivity",
      value: "94%",
      change: "+5%",
      trend: "up",
      icon: Activity,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/5"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Executive KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Card 
            key={index}
            className="relative overflow-hidden border-0 bg-gradient-to-br from-background to-muted/30 backdrop-blur-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group animate-scale-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg group-hover:shadow-2xl transition-all duration-300`}>
                  <kpi.icon className="h-6 w-6 text-white" />
                </div>
                <Badge 
                  variant="secondary" 
                  className={`gap-1 ${kpi.trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'} border-0`}
                >
                  {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {kpi.change}
                </Badge>
              </div>
              
              <h3 className="text-sm font-medium text-muted-foreground mb-1">{kpi.title}</h3>
              <p className="text-3xl font-black font-['Space_Grotesk']">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Meetings Timeline */}
        <Card className="lg:col-span-2 border-0 bg-gradient-to-br from-background to-muted/20 backdrop-blur-xl overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 animate-pulse" />
          
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-['Space_Grotesk']">Today's Schedule</CardTitle>
                  <p className="text-sm text-muted-foreground">{todayMeetings} meetings planned</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/meetings')}
                className="gap-2 hover:bg-primary/10"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="relative space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No meetings scheduled for today</p>
              </div>
            ) : (
              meetings.slice(0, 4).map((meeting, index) => (
                <div
                  key={meeting.id}
                  className="p-4 rounded-xl bg-gradient-to-br from-background to-muted/30 border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">{meeting.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(meeting.start_time), "h:mm a")}
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {meeting.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`${
                        meeting.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                        meeting.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-gray-500/10 text-gray-600'
                      } border-0`}
                    >
                      {meeting.status === 'completed' ? 'Completed' :
                       meeting.status === 'in_progress' ? 'In Progress' :
                       'Scheduled'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Priority Actions */}
        <Card className="border-0 bg-gradient-to-br from-background to-muted/20 backdrop-blur-xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 animate-pulse" />
          
          <CardHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-['Space_Grotesk']">Priority Actions</CardTitle>
                <p className="text-sm text-muted-foreground">{urgentActions} urgent items</p>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-bold">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardHeader>
          
          <CardContent className="relative space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : actions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              actions.slice(0, 5).map((action, index) => {
                const daysUntilDue = Math.floor((new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysUntilDue <= 2;
                
                return (
                  <div
                    key={action.id}
                    className={`p-3 rounded-lg border transition-all duration-300 cursor-pointer hover:shadow-md animate-fade-in ${
                      isUrgent 
                        ? 'bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20 hover:border-red-500/40' 
                        : 'bg-gradient-to-br from-background to-muted/20 border-border/50 hover:border-primary/30'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate('/actions')}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 p-1 rounded ${action.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        {action.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{action.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs border-0">
                            {daysUntilDue <= 0 ? 'Overdue' : `${daysUntilDue}d left`}
                          </Badge>
                          {action.priority && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs border-0 ${
                                action.priority === 'high' ? 'bg-red-500/10 text-red-600' :
                                action.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-600' :
                                'bg-gray-500/10 text-gray-600'
                              }`}
                            >
                              {action.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            <Button 
              variant="outline" 
              className="w-full mt-4 gap-2 hover:bg-primary/10"
              onClick={() => navigate('/actions')}
            >
              View All Actions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Bar */}
      <Card className="border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 backdrop-blur-xl animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Access frequently used features</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/meetings')}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                New Meeting
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/actions')}
                className="gap-2"
              >
                <Target className="h-4 w-4" />
                Add Action
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/analytics')}
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                View Analytics
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};