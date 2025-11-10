import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Brain, Sparkles, TrendingUp, Calendar, ChevronRight, Clock, MapPin, ArrowLeft, FileText, BarChart3, Headphones, HelpCircle, CheckCircle2, AlertCircle, PenTool, CalendarCheck } from 'lucide-react';
import { TempoBalanceEngine } from '@/components/TempoBalanceEngine';
import { EngagementHeatmap } from '@/components/EngagementHeatmap';
import { DecisionDensityTracker } from '@/components/DecisionDensityTracker';
import { CognitiveFatigueIndex } from '@/components/CognitiveFatigueIndex';
import { MeetingFlowOrchestrator } from '@/components/MeetingFlowOrchestrator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExecutiveMeetingAdvisor } from '@/components/ExecutiveMeetingAdvisor';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Lazy load AI feature components
const MeetingKeyPointsSummary = lazy(() => import('@/components/MeetingKeyPointsSummary').then(m => ({ default: m.MeetingKeyPointsSummary })));
const LiveQAGenerator = lazy(() => import('@/components/LiveQAGenerator').then(m => ({ default: m.LiveQAGenerator })));
const MeetingEffectivenessScoring = lazy(() => import('@/components/MeetingEffectivenessScoring').then(m => ({ default: m.MeetingEffectivenessScoring })));
const MeetingClosingSummary = lazy(() => import('@/components/MeetingClosingSummary').then(m => ({ default: m.MeetingClosingSummary })));
const UnifiedEmotionIntelligence = lazy(() => import('@/components/UnifiedEmotionIntelligence').then(m => ({ default: m.UnifiedEmotionIntelligence })));
const MeetingAnalytics = lazy(() => import('@/components/MeetingAnalytics').then(m => ({ default: m.MeetingAnalytics })));
const EnhancedDecisionsList = lazy(() => import('@/components/EnhancedDecisionsList').then(m => ({ default: m.EnhancedDecisionsList })));
const EnhancedDocumentsTab = lazy(() => import('@/components/EnhancedDocumentsTab').then(m => ({ default: m.EnhancedDocumentsTab })));

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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MeetingCategory | null>(null);
  
  // Track last viewed timestamps for each category
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
      const { data, error } = await supabase
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
      
      if (error) {
        console.error('Error fetching meetings:', error);
        toast.error('Failed to load meetings: ' + error.message);
        setMeetings([]);
      } else {
        setMeetings(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching meetings:', err);
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
    
    // Priority: Check signature status first if meeting has signature requests
    if (hasSignatureRequests) {
      const allSignaturesCompleted = meeting.signature_requests?.every(
        sr => sr.status === 'completed' || sr.status === 'approved'
      );
      const hasPendingSignatures = meeting.signature_requests?.some(
        sr => sr.status === 'pending' || sr.status === 'requested'
      );
      
      if (allSignaturesCompleted) {
        return 'signoff_approved';
      }
      
      if (hasPendingSignatures) {
        return 'signoff_pending';
      }
    }
    
    // For meetings without signature requests, categorize by actual status
    // Only show as completed if status is explicitly 'completed'
    if (meeting.status === 'completed') {
      return 'completed';
    }
    
    // Upcoming meetings (scheduled, in future)
    if (startTime > now || meeting.status === 'scheduled') {
      return 'upcoming';
    }
    
    // In progress, paused, or other active states should be in upcoming
    if (meeting.status === 'in_progress' || meeting.status === 'paused') {
      return 'upcoming';
    }
    
    // Default to upcoming for safety (don't auto-mark as completed)
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

  // Set up realtime subscriptions for automatic updates
  useEffect(() => {
    if (!user?.id) return;

    const meetingsChannel = supabase
      .channel('meetings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings'
        },
        () => {
          // Refetch meetings when any meeting changes
          fetchMeetings();
        }
      )
      .subscribe();

    const signatureRequestsChannel = supabase
      .channel('signature-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signature_requests'
        },
        () => {
          // Refetch meetings when any signature request changes
          fetchMeetings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(signatureRequestsChannel);
    };
  }, [user?.id]);

  const handleMeetingSelect = async (meetingId: string, category?: MeetingCategory) => {
    // Route to appropriate page based on category
    if (category === 'signoff_pending') {
      // Get the signature request ID for this meeting
      const meeting = meetings.find(m => m.id === meetingId);
      if (meeting?.signature_requests?.[0]?.id) {
        navigate(`/signature/${meeting.signature_requests[0].id}`);
        return;
      }
    } else if (category === 'signoff_approved') {
      navigate(`/meetings/${meetingId}`);
      return;
    }
    
    // For other categories, show detail view in advisor
    setSelectedMeetingId(meetingId);
    
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();
    
    if (data) {
      setSelectedMeeting(data);
    }
  };

  const handleBackToList = () => {
    setSelectedMeetingId(null);
    setSelectedMeeting(null);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
  };

  const handleCategoryClick = (category: MeetingCategory) => {
    // Mark category as viewed
    const now = new Date();
    const updated = { ...lastViewedTimestamps, [category]: now };
    setLastViewedTimestamps(updated);
    
    // Persist to localStorage
    localStorage.setItem('executive_advisor_last_viewed', JSON.stringify({
      upcoming: updated.upcoming.toISOString(),
      completed: updated.completed.toISOString(),
      signoff_pending: updated.signoff_pending.toISOString(),
      signoff_approved: updated.signoff_approved.toISOString(),
    }));
    
    setSelectedCategory(category);
  };

  // Check if a category has new meetings
  const hasNewMeetings = (category: MeetingCategory): boolean => {
    const categoryMeetings = categorizedMeetings[category];
    const lastViewed = lastViewedTimestamps[category];
    
    return categoryMeetings.some(meeting => {
      const meetingDate = new Date(meeting.start_time);
      return meetingDate > lastViewed;
    });
  };

  // Count new meetings in a category
  const getNewMeetingsCount = (category: MeetingCategory): number => {
    const categoryMeetings = categorizedMeetings[category];
    const lastViewed = lastViewedTimestamps[category];
    
    return categoryMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.start_time);
      return meetingDate > lastViewed;
    }).length;
  };

  const getCategoryConfig = (category: MeetingCategory) => {
    const configs = {
      upcoming: {
        title: 'Upcoming Meetings',
        description: 'Scheduled and future meetings',
        icon: CalendarCheck,
        color: 'primary',
        gradient: 'from-primary to-primary-dark',
        bgGradient: 'from-background to-primary/5',
      },
      completed: {
        title: 'Completed Meetings',
        description: 'Past meetings with records',
        icon: CheckCircle2,
        color: 'success',
        gradient: 'from-success to-success/80',
        bgGradient: 'from-background to-success/5',
      },
      signoff_pending: {
        title: 'Signature Pending',
        description: 'Awaiting sign-off approval',
        icon: AlertCircle,
        color: 'warning',
        gradient: 'from-warning to-warning/80',
        bgGradient: 'from-background to-warning/5',
      },
      signoff_approved: {
        title: 'Signature Approved',
        description: 'Sign-off completed',
        icon: CheckCircle2,
        color: 'success',
        gradient: 'from-success to-emerald-600',
        bgGradient: 'from-background to-success/5',
      },
    };
    return configs[category];
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

  // Category list view
  if (selectedCategory && !selectedMeetingId) {
    const config = getCategoryConfig(selectedCategory);
    const Icon = config.icon;
    const categoryMeetings = categorizedMeetings[selectedCategory];
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToCategories}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Button>
        </div>

        <Card className={`border-0 bg-gradient-to-br ${config.bgGradient} shadow-lg`}>
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} shadow-md`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{config.title}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className={`text-lg px-3 py-1 bg-${config.color}/10 text-${config.color}`}>
                {categoryMeetings.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {categoryMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className={`p-4 rounded-full bg-${config.color}/10 mb-3`}>
                  <Icon className={`h-10 w-10 text-${config.color}/40`} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No meetings in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryMeetings.map((meeting) => (
                  <Card 
                    key={meeting.id}
                    className={`relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-${config.color} hover:scale-[1.02] active:scale-[0.98] group bg-gradient-to-r from-background via-background to-${config.color}/5`}
                    onClick={() => handleMeetingSelect(meeting.id, selectedCategory)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r from-${config.color}/0 via-${config.color}/5 to-${config.color}/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold mb-2 truncate group-hover:text-${config.color} transition-colors text-base`}>{meeting.title}</h4>
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded bg-${config.color}/10 group-hover:bg-${config.color}/20 transition-colors`}>
                                <Calendar className={`h-3 w-3 text-${config.color}`} />
                              </div>
                              <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded bg-${config.color}/10 group-hover:bg-${config.color}/20 transition-colors`}>
                                <Clock className={`h-3 w-3 text-${config.color}`} />
                              </div>
                              <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'p') : 'TBD'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className={`p-2 rounded-full bg-${config.color}/10 group-hover:bg-${config.color} group-hover:text-white transition-all duration-200`}>
                            <ChevronRight className={`h-5 w-5 text-${config.color} group-hover:text-white group-hover:translate-x-1 transition-all`} />
                          </div>
                          <span className={`text-[10px] font-medium text-${config.color} opacity-0 group-hover:opacity-100 transition-opacity`}>View</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main category cards view
  if (!selectedMeetingId) {
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowHelpGuide(true)}
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                User Guide
              </Button>
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4 drop-shadow-lg">
              Executive Meeting Advisor
            </h1>
            <p className="text-lg lg:text-xl text-white/95 max-w-2xl mb-8 drop-shadow-md">
              Your intelligent AI copilot for strategic meetings. Get real-time coaching on tempo management, 
              decision-making, and success optimization powered by Ethiopian Telecom innovation.
            </p>
          </div>
        </div>

        {/* Meeting Categories */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">Meeting Analysis</h2>
              <p className="text-sm text-muted-foreground">Click a category to view meetings</p>
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

        {/* Help Guide Sheet */}
        <Sheet open={showHelpGuide} onOpenChange={setShowHelpGuide}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                AI Features User Guide
              </SheetTitle>
              <SheetDescription>
                Learn how to use the AI-powered features in the Executive Meeting Advisor
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <Card className="border-0 bg-gradient-to-br from-background to-primary/5 backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <div className="p-2.5 w-fit rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg mb-2">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg font-display">AI Coaching</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Real-time strategic guidance and meeting facilitation tips
                  </p>
                  <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                    <li>Get live coaching during active meetings</li>
                    <li>Receive tempo management suggestions</li>
                    <li>Optimize decision-making processes</li>
                    <li>Balance participation across attendees</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-background to-secondary/5 backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <div className="p-2.5 w-fit rounded-xl bg-gradient-to-br from-secondary to-secondary/80 shadow-lg mb-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg font-display">Effectiveness Scoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Participation balance, decision quality, and tempo adherence
                  </p>
                  <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                    <li>Track meeting effectiveness metrics</li>
                    <li>Monitor participant engagement levels</li>
                    <li>Analyze decision quality patterns</li>
                    <li>Review tempo and time management</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-background to-[hsl(86,53%,51%)]/5 backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <div className="p-2.5 w-fit rounded-xl bg-gradient-to-br from-[hsl(86,53%,51%)] to-[hsl(198,100%,37%)] shadow-lg mb-2">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg font-display">Key Points & Q&A</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Automatic insights extraction and intelligent Q&A generation
                  </p>
                  <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                    <li>Auto-extract key discussion points</li>
                    <li>Generate relevant questions from context</li>
                    <li>Get AI-powered answer suggestions</li>
                    <li>Track Q&A sessions throughout meetings</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-background to-success/5 backdrop-blur-xl shadow-lg">
                <CardHeader className="pb-3">
                  <div className="p-2.5 w-fit rounded-xl bg-gradient-to-br from-success to-success/80 shadow-lg mb-2">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-lg font-display">Closing Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    AI-generated summaries based on meeting status and tempo
                  </p>
                  <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
                    <li>Automatically summarize meeting outcomes</li>
                    <li>Highlight key decisions and action items</li>
                    <li>Generate comprehensive closing reports</li>
                    <li>Export summaries in multiple formats</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Meeting detail view with AI features
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackToList}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Button>
        <Button 
          onClick={() => setShowAdvisorModal(true)}
          className="gap-2 bg-gradient-to-r from-[hsl(86,53%,51%)] to-[hsl(198,100%,37%)] hover:from-[hsl(86,53%,45%)] hover:to-[hsl(198,100%,32%)] text-white"
        >
          <Headphones className="h-4 w-4" />
          Open AI Coach
        </Button>
      </div>

      {selectedMeeting && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{selectedMeeting.title}</CardTitle>
                {selectedMeeting.description && (
                  <CardDescription className="text-base">{selectedMeeting.description}</CardDescription>
                )}
              </div>
              <Badge variant="outline" className="text-sm">
                {selectedMeeting.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {selectedMeeting.start_time ? format(new Date(selectedMeeting.start_time), 'PPP') : 'TBD'}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {selectedMeeting.start_time ? format(new Date(selectedMeeting.start_time), 'p') : 'TBD'}
              </span>
              {selectedMeeting.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selectedMeeting.location}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="consultant" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="consultant" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Real-Time Consultant
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Intelligence
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="decisions" className="gap-2">
            <FileText className="h-4 w-4" />
            Decisions
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultant" className="space-y-6">
          {selectedMeeting && (
            <div className="space-y-6">
              {/* Hero Section for Real-Time Consultant */}
              <Card className="border-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 shadow-xl">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                      <Sparkles className="h-6 w-6 text-white animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-display">AI-Powered Real-Time Meeting Consultant</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Revolutionary cognitive assistant monitoring and optimizing meeting flow in real-time
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Main Consultant Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TempoBalanceEngine 
                  meetingId={selectedMeetingId}
                  meetingDuration={60}
                  agendaItems={5}
                  currentProgress={45}
                />
                <DecisionDensityTracker 
                  meetingId={selectedMeetingId}
                  meetingDuration={60}
                  startTime={selectedMeeting.start_time}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EngagementHeatmap meetingId={selectedMeetingId} />
                <CognitiveFatigueIndex 
                  meetingId={selectedMeetingId}
                  meetingDuration={60}
                  startTime={selectedMeeting.start_time}
                />
              </div>

              <MeetingFlowOrchestrator 
                meetingId={selectedMeetingId}
                meetingDuration={60}
                startTime={selectedMeeting.start_time}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MeetingKeyPointsSummary meetingId={selectedMeetingId} />
              <LiveQAGenerator meetingId={selectedMeetingId} />
            </div>
            <MeetingEffectivenessScoring meetingId={selectedMeetingId} />
            <MeetingClosingSummary 
              meetingId={selectedMeetingId}
              meetingStatus={selectedMeeting?.status || ''}
              isActive={selectedMeeting?.status === 'in_progress'}
            />
            <UnifiedEmotionIntelligence meetingId={selectedMeetingId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <MeetingAnalytics meetingId={selectedMeetingId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <EnhancedDecisionsList meetingId={selectedMeetingId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <EnhancedDocumentsTab meetingId={selectedMeetingId} />
          </Suspense>
        </TabsContent>
      </Tabs>

      {showAdvisorModal && selectedMeeting && (
        <ExecutiveMeetingAdvisor
          meetingId={selectedMeetingId!}
          isHost={true}
          meetingData={selectedMeeting}
          onClose={() => setShowAdvisorModal(false)}
        />
      )}
    </div>
  );
}
