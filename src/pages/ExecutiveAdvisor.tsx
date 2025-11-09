import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Sparkles, TrendingUp, Users, Calendar, PlayCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function ExecutiveAdvisor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentMeetings = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(5);
    
    if (data) {
      setRecentMeetings(data);
    }
  };

  useEffect(() => {
    fetchRecentMeetings();
  }, [user?.id]);

  const launchAdvisor = (meetingId: string) => {
    navigate(`/meeting/${meetingId}`);
    // Trigger advisor to open via custom event
    setTimeout(() => {
      const event = new CustomEvent('openExecutiveAdvisor');
      window.dispatchEvent(event);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 lg:p-12 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Brain className="h-8 w-8 animate-pulse" />
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              AI-Powered
            </Badge>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Executive Meeting Advisor
          </h1>
          <p className="text-lg lg:text-xl text-white/90 max-w-2xl mb-8">
            Your intelligent AI copilot for strategic meetings. Get real-time coaching on tempo management, 
            decision-making, and success optimization.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-white/90 font-semibold shadow-lg"
              onClick={() => navigate('/meetings')}
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Start with a Meeting
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-500/20 hover:border-blue-500/40 transition-colors">
          <CardHeader className="pb-3">
            <div className="p-2 w-fit rounded-lg bg-blue-500/10 mb-2">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg">AI Coaching</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Real-time strategic guidance and meeting facilitation tips from your AI advisor
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <CardHeader className="pb-3">
            <div className="p-2 w-fit rounded-lg bg-purple-500/10 mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Tempo Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor pacing, time allocation, and meeting flow with live metrics and alerts
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-pink-500/20 hover:border-pink-500/40 transition-colors">
          <CardHeader className="pb-3">
            <div className="p-2 w-fit rounded-lg bg-pink-500/10 mb-2">
              <Sparkles className="h-5 w-5 text-pink-600" />
            </div>
            <CardTitle className="text-lg">Key Points</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatic extraction of critical insights, decisions, and action items
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/20 hover:border-green-500/40 transition-colors">
          <CardHeader className="pb-3">
            <div className="p-2 w-fit rounded-lg bg-green-500/10 mb-2">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle className="text-lg">Success Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Live tracking of engagement, participation balance, and meeting effectiveness
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Meetings */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Launch Advisor for Meeting
              </CardTitle>
              <CardDescription>Select a recent meeting to start AI-powered coaching</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentMeetings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No recent meetings found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/meetings')}
              >
                View All Meetings
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMeetings.map((meeting) => (
                <Card 
                  key={meeting.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => launchAdvisor(meeting.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{meeting.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {meeting.start_time ? new Date(meeting.start_time).toLocaleDateString() : 'TBD'}
                          </span>
                          <Badge variant="outline">{meeting.status}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Four powerful capabilities in one intelligent system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 mt-1">
                  <span className="text-lg font-bold text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Real-Time AI Conversation</h4>
                  <p className="text-sm text-muted-foreground">
                    Voice-enabled AI advisor that answers questions and provides strategic guidance throughout your meeting
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 mt-1">
                  <span className="text-lg font-bold text-purple-600">2</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Meeting Tempo Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Live metrics on pacing, time management, engagement levels, and decision velocity
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10 mt-1">
                  <span className="text-lg font-bold text-pink-600">3</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Automatic Key Points</h4>
                  <p className="text-sm text-muted-foreground">
                    AI extracts critical decisions, actions, insights, and concerns as they happen
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 mt-1">
                  <span className="text-lg font-bold text-green-600">4</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Success Analytics</h4>
                  <p className="text-sm text-muted-foreground">
                    Track participation balance, decision quality, time management, and overall meeting effectiveness
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
