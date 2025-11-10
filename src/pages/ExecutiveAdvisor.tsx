import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, ChevronRight, AlertCircle, BookOpen, Inbox, CalendarCheck, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Meeting {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
  meeting_type: string;
  signature_requests?: Array<{
    id: string;
    status: string;
  }>;
}

type MeetingCategory = 'upcoming' | 'completed' | 'signoff_pending' | 'signoff_approved';

export default function ExecutiveAdvisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastViewedTimestamps, setLastViewedTimestamps] = useState<Record<MeetingCategory, Date>>(() => {
    const stored = localStorage.getItem('executive_advisor_last_viewed');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        upcoming: parsed.upcoming ? new Date(parsed.upcoming) : new Date(0),
        completed: parsed.completed ? new Date(parsed.completed) : new Date(0),
        signoff_pending: parsed.signoff_pending ? new Date(parsed.signoff_pending) : new Date(0),
        signoff_approved: parsed.signoff_approved ? new Date(parsed.signoff_approved) : new Date(0),
      };
    }
    return {
      upcoming: new Date(0),
      completed: new Date(0),
      signoff_pending: new Date(0),
      signoff_approved: new Date(0),
    };
  });

  const fetchMeetings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data: baseMeetings, error: baseError } = await supabase
        .from('meetings')
        .select(`
          *,
          signature_requests (
            id,
            status
          )
        `)
        .order('start_time', { ascending: false })
        .limit(50);

      if (baseError) throw baseError;

      const { data: mySRs, error: srError } = await supabase
        .from('signature_requests')
        .select('meeting_id, status')
        .in('status', ['pending', 'requested', 'delegated'])
        .or(`assigned_to.eq.${user.id},requested_by.eq.${user.id}`);

      if (srError) throw srError;

      const base = baseMeetings || [];
      const srMeetingIds = Array.from(new Set((mySRs || []).map((s: any) => s.meeting_id)));
      const missingIds = srMeetingIds.filter((id) => !base.some((m: any) => m.id === id));

      let extra: any[] = [];
      if (missingIds.length > 0) {
        const { data: extraMeetings, error: extraError } = await supabase
          .from('meetings')
          .select(`
            *,
            signature_requests (
              id,
              status
            )
          `)
          .in('id', missingIds);
        if (extraError) throw extraError;
        extra = extraMeetings || [];
      }

      const mergedMap = new Map<string, any>();
      [...base, ...extra].forEach((m: any) => mergedMap.set(m.id, m));

      setMeetings(Array.from(mergedMap.values()));
    } catch (err: any) {
      console.error('Error fetching meetings:', err);
      toast.error('Failed to load meetings');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const categorizeMeeting = (meeting: Meeting): MeetingCategory => {
    const now = new Date();
    const startTime = new Date(meeting.start_time);
    
    const hasSignatureRequests = meeting.signature_requests && meeting.signature_requests.length > 0;
    
    if (hasSignatureRequests) {
      const allSignaturesCompleted = meeting.signature_requests?.every(
        sr => sr.status === 'completed' || sr.status === 'approved'
      );
      const hasPendingSignatures = meeting.signature_requests?.some(
        sr => ['pending', 'requested', 'delegated'].includes(sr.status)
      );
      
      if (allSignaturesCompleted) {
        return 'signoff_approved';
      }
      
      if (hasPendingSignatures) {
        return 'signoff_pending';
      }
    }
    
    if (meeting.status === 'completed') {
      return 'completed';
    }
    
    if (startTime > now || meeting.status === 'scheduled') {
      return 'upcoming';
    }
    
    if (meeting.status === 'in_progress' || meeting.status === 'paused') {
      return 'upcoming';
    }
    
    return 'upcoming';
  };

  const categorizedMeetings = {
    upcoming: meetings.filter(m => {
      const category = categorizeMeeting(m);
      return category === 'upcoming' && !m.signature_requests?.length;
    }),
    completed: meetings.filter(m => {
      const category = categorizeMeeting(m);
      return category === 'completed' && !m.signature_requests?.length;
    }),
    signoff_pending: meetings.filter(m => categorizeMeeting(m) === 'signoff_pending'),
    signoff_approved: meetings.filter(m => categorizeMeeting(m) === 'signoff_approved'),
  };

  useEffect(() => {
    fetchMeetings();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const meetingsChannel = supabase
      .channel('meetings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchMeetings();
      })
      .subscribe();

    const signatureRequestsChannel = supabase
      .channel('signature-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signature_requests' }, () => {
        fetchMeetings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(signatureRequestsChannel);
    };
  }, [user?.id]);

  const handleCategoryClick = (category: MeetingCategory) => {
    const now = new Date();
    const updated = { ...lastViewedTimestamps, [category]: now };
    setLastViewedTimestamps(updated);
    
    localStorage.setItem('executive_advisor_last_viewed', JSON.stringify({
      upcoming: updated.upcoming.toISOString(),
      completed: updated.completed.toISOString(),
      signoff_pending: updated.signoff_pending.toISOString(),
      signoff_approved: updated.signoff_approved.toISOString(),
    }));
    
    // Navigate based on category
    if (category === 'signoff_pending' || category === 'signoff_approved') {
      const meetings = categorizedMeetings[category];
      if (meetings.length > 0) {
        const meeting = meetings[0];
        if (category === 'signoff_pending' && meeting.signature_requests?.[0]?.id) {
          navigate(`/signature/${meeting.signature_requests[0].id}`);
        } else {
          navigate(`/meetings/${meeting.id}`);
        }
      }
    } else {
      navigate(`/meetings`);
    }
  };

  const hasNewMeetings = (category: MeetingCategory): boolean => {
    const categoryMeetings = categorizedMeetings[category];
    const lastViewed = lastViewedTimestamps[category];
    
    return categoryMeetings.some(meeting => {
      const meetingDate = new Date(meeting.start_time);
      return meetingDate > lastViewed;
    });
  };

  const getNewMeetingsCount = (category: MeetingCategory): number => {
    const categoryMeetings = categorizedMeetings[category];
    const lastViewed = lastViewedTimestamps[category];
    
    return categoryMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.start_time);
      return meetingDate > lastViewed;
    }).length;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section - Ethio Telecom Branded */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(86,53%,51%)] via-[hsl(198,100%,37%)] to-[hsl(86,53%,35%)] p-8 lg:p-12 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(86,53%,51%)]/20 to-[hsl(198,100%,37%)]/20 animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl glass backdrop-blur-xl border-white/30 bg-white/10">
                <Brain className="h-8 w-8 animate-pulse drop-shadow-lg" />
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
                AI-Powered Intelligence
              </Badge>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4 drop-shadow-lg">
            Executive Intelligence Hub
          </h1>
          <p className="text-lg lg:text-xl text-white/95 max-w-2xl mb-8 drop-shadow-md">
            Your AI-powered workspace for meetings, documents, and strategic insights powered by Ethiopian Telecom innovation.
          </p>
        </div>
      </div>

      {/* AI Tools Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">AI Intelligence Tools</h2>
            <p className="text-sm text-muted-foreground">AI-powered document analysis and insights</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NotebookLM Library Card */}
          <Card 
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border-2 hover:border-primary/50 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10"
            onClick={() => navigate('/notebooks-library')}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">NotebookLM Library</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI-powered research and analysis workspace. Chat with your documents, meetings, and sources using advanced AI.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Chat
                      </Badge>
                      <Badge variant="secondary" className="text-xs">Document Analysis</Badge>
                      <Badge variant="secondary" className="text-xs">Meeting Insights</Badge>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>

          {/* Executive Inbox Card */}
          <Card 
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border-2 hover:border-primary/50 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10"
            onClick={() => navigate('/executive-inbox')}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Inbox className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Executive Inbox</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI-prioritized documents requiring your attention with smart urgency indicators and recommended response deadlines.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Priority Scoring
                      </Badge>
                      <Badge variant="secondary" className="text-xs">Urgency Tracking</Badge>
                      <Badge variant="secondary" className="text-xs">Smart Deadlines</Badge>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Meeting Categories */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
            <CalendarCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold">Meeting Management</h2>
            <p className="text-sm text-muted-foreground">Track and manage your meetings</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Meetings Card */}
            <Card 
              className="group relative overflow-hidden border-0 bg-gradient-to-br from-background to-primary/5 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => handleCategoryClick('upcoming')}
            >
              {hasNewMeetings('upcoming') && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-destructive text-destructive-foreground animate-pulse shadow-lg">
                    {getNewMeetingsCount('upcoming')} NEW
                  </Badge>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CalendarCheck className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-2xl px-4 py-2 bg-primary/10 text-primary font-bold">
                    {categorizedMeetings.upcoming.length}
                  </Badge>
                </div>
                <h3 className="text-2xl font-display font-bold mb-2 group-hover:text-primary transition-colors">
                  Upcoming Meetings
                </h3>
                <p className="text-muted-foreground mb-4">
                  Scheduled and future meetings
                </p>
                <div className="flex items-center gap-2 text-sm text-primary font-medium group-hover:gap-3 transition-all">
                  <span>View meetings</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* Completed Meetings Card */}
            <Card 
              className="group relative overflow-hidden border-0 bg-gradient-to-br from-background to-success/5 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => handleCategoryClick('completed')}
            >
              {hasNewMeetings('completed') && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-destructive text-destructive-foreground animate-pulse shadow-lg">
                    {getNewMeetingsCount('completed')} NEW
                  </Badge>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/10 to-success/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-success to-success/80 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-2xl px-4 py-2 bg-success/10 text-success font-bold">
                    {categorizedMeetings.completed.length}
                  </Badge>
                </div>
                <h3 className="text-2xl font-display font-bold mb-2 group-hover:text-success transition-colors">
                  Completed Meetings
                </h3>
                <p className="text-muted-foreground mb-4">
                  Past meetings with records
                </p>
                <div className="flex items-center gap-2 text-sm text-success font-medium group-hover:gap-3 transition-all">
                  <span>View meetings</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* Signature Pending Card */}
            <Card 
              className="group relative overflow-hidden border-0 bg-gradient-to-br from-background to-warning/5 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => handleCategoryClick('signoff_pending')}
            >
              {hasNewMeetings('signoff_pending') && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-destructive text-destructive-foreground animate-pulse shadow-lg">
                    {getNewMeetingsCount('signoff_pending')} NEW
                  </Badge>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-warning/0 via-warning/10 to-warning/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-warning to-warning/80 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <AlertCircle className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-2xl px-4 py-2 bg-warning/10 text-warning font-bold">
                    {categorizedMeetings.signoff_pending.length}
                  </Badge>
                </div>
                <h3 className="text-2xl font-display font-bold mb-2 group-hover:text-warning transition-colors">
                  Signature Pending
                </h3>
                <p className="text-muted-foreground mb-4">
                  Awaiting sign-off approval
                </p>
                <div className="flex items-center gap-2 text-sm text-warning font-medium group-hover:gap-3 transition-all">
                  <span>View meetings</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>

            {/* Signature Approved Card */}
            <Card 
              className="group relative overflow-hidden border-0 bg-gradient-to-br from-background to-success/5 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => handleCategoryClick('signoff_approved')}
            >
              {hasNewMeetings('signoff_approved') && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="bg-destructive text-destructive-foreground animate-pulse shadow-lg">
                    {getNewMeetingsCount('signoff_approved')} NEW
                  </Badge>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/10 to-success/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-success to-emerald-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-2xl px-4 py-2 bg-success/10 text-success font-bold">
                    {categorizedMeetings.signoff_approved.length}
                  </Badge>
                </div>
                <h3 className="text-2xl font-display font-bold mb-2 group-hover:text-success transition-colors">
                  Signature Approved
                </h3>
                <p className="text-muted-foreground mb-4">
                  Sign-off completed
                </p>
                <div className="flex items-center gap-2 text-sm text-success font-medium group-hover:gap-3 transition-all">
                  <span>View meetings</span>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
