import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Brain, Sparkles, TrendingUp, Users, Calendar, PlayCircle, ChevronRight, X, Clock, MapPin, ArrowLeft, FileText, BarChart3, Headphones, HelpCircle, CheckCircle2, AlertCircle, PenTool, CalendarCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExecutiveSignatureRequests } from '@/components/ExecutiveSignatureRequests';
import { ExecutiveMeetingAdvisor } from '@/components/ExecutiveMeetingAdvisor';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MeetingCategory | null>(null);

  const fetchMeetings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data } = await supabase
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
    
    if (data) {
      setMeetings(data);
    }
    setLoading(false);
  };

  const categorizeMeeting = (meeting: Meeting): MeetingCategory => {
    const now = new Date();
    const startTime = new Date(meeting.start_time);
    
    // Check for signature requests
    const hasSignatureRequests = meeting.signature_requests && meeting.signature_requests.length > 0;
    const allSignaturesCompleted = hasSignatureRequests && 
      meeting.signature_requests?.every(sr => sr.status === 'completed');
    const hasCompletedSignatures = hasSignatureRequests && allSignaturesCompleted;
    const hasPendingSignatures = hasSignatureRequests && 
      meeting.signature_requests?.some(sr => sr.status === 'pending');
    
    // Priority: Sign-off status > Meeting status > Time-based
    if (hasCompletedSignatures) {
      return 'signoff_approved';
    }
    
    if (hasPendingSignatures) {
      return 'signoff_pending';
    }
    
    if (meeting.status === 'completed') {
      return 'completed';
    }
    
    if (startTime > now) {
      return 'upcoming';
    }
    
    return 'completed';
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

  const handleMeetingSelect = async (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    
    // Fetch full meeting details
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

  // Category list view (show when viewing a specific category)
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
                    onClick={() => handleMeetingSelect(meeting.id)}
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary p-8 lg:p-12 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 animate-pulse"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl glass backdrop-blur-xl border-white/30">
                  <Brain className="h-8 w-8 animate-pulse drop-shadow-lg" />
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1 bg-white/20 backdrop-blur-sm border-white/30 text-white">
                  AI-Powered Intelligence
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowHelpGuide(true)}
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 gap-2"
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

        {/* Meeting Analysis Section */}
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
                onClick={() => setSelectedCategory('upcoming')}
              >
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
                onClick={() => setSelectedCategory('completed')}
              >
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
                onClick={() => setSelectedCategory('signoff_pending')}
              >
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
                onClick={() => setSelectedCategory('signoff_approved')}
              >
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
                <CardContent className="pt-4">
                  <ScrollArea className="h-[400px] pr-4">
                    {categorizedMeetings.upcoming.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-primary/10 mb-3">
                          <Calendar className="h-10 w-10 text-primary/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No upcoming meetings</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Schedule a meeting to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categorizedMeetings.upcoming.map((meeting) => (
                          <Card 
                            key={meeting.id}
                            className="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary hover:scale-[1.02] active:scale-[0.98] group bg-gradient-to-r from-background via-background to-primary/5"
                            onClick={() => handleMeetingSelect(meeting.id)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <CardContent className="p-4 relative">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-2 truncate group-hover:text-primary transition-colors text-base">{meeting.title}</h4>
                                  <div className="space-y-1.5 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <Calendar className="h-3 w-3 text-primary" />
                                      </div>
                                      <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <Clock className="h-3 w-3 text-primary" />
                                      </div>
                                      <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'p') : 'TBD'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-200">
                                    <ChevronRight className="h-5 w-5 text-primary group-hover:text-white group-hover:translate-x-1 transition-all" />
                                  </div>
                                  <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Completed Meetings */}
              <Card className="border-0 bg-gradient-to-br from-background to-success/5 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-success to-success/80 shadow-md">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Completed Meetings</CardTitle>
                        <CardDescription>Past meetings with records</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1 bg-success/10 text-success">
                      {categorizedMeetings.completed.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ScrollArea className="h-[400px] pr-4">
                    {categorizedMeetings.completed.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-success/10 mb-3">
                          <CheckCircle2 className="h-10 w-10 text-success/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No completed meetings</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Completed meetings will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categorizedMeetings.completed.map((meeting) => (
                          <Card 
                            key={meeting.id}
                            className="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-success hover:scale-[1.02] active:scale-[0.98] group bg-gradient-to-r from-background via-background to-success/5"
                            onClick={() => handleMeetingSelect(meeting.id)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-success/0 via-success/5 to-success/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <CardContent className="p-4 relative">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-2 truncate group-hover:text-success transition-colors text-base">{meeting.title}</h4>
                                  <div className="space-y-1.5 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded bg-success/10 group-hover:bg-success/20 transition-colors">
                                        <Calendar className="h-3 w-3 text-success" />
                                      </div>
                                      <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="p-1 rounded bg-success/10 group-hover:bg-success/20 transition-colors">
                                        <Clock className="h-3 w-3 text-success" />
                                      </div>
                                      <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'p') : 'TBD'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <div className="p-2 rounded-full bg-success/10 group-hover:bg-success group-hover:text-white transition-all duration-200">
                                    <ChevronRight className="h-5 w-5 text-success group-hover:text-white group-hover:translate-x-1 transition-all" />
                                  </div>
                                  <span className="text-[10px] font-medium text-success opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Signature Requests Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-warning to-warning/80">
              <PenTool className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold">Signature Requests</h2>
              <p className="text-sm text-muted-foreground">Manage meeting approvals and sign-offs</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sign-off Pending */}
            <Card className="border-0 bg-gradient-to-br from-background to-warning/5 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-warning to-warning/80 shadow-md">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Signature Pending</CardTitle>
                      <CardDescription>Awaiting signature approval</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1 bg-warning/10 text-warning">
                    {categorizedMeetings.signoff_pending.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {categorizedMeetings.signoff_pending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-warning/10 mb-3">
                        <AlertCircle className="h-10 w-10 text-warning/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No pending sign-offs</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">All signature requests are up to date</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categorizedMeetings.signoff_pending.map((meeting) => (
                        <Card 
                          key={meeting.id}
                          className="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-warning hover:scale-[1.02] active:scale-[0.98] group bg-gradient-to-r from-background via-background to-warning/5"
                          onClick={() => handleMeetingSelect(meeting.id)}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-warning/0 via-warning/5 to-warning/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <CardContent className="p-4 relative">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold truncate flex-1 group-hover:text-warning transition-colors text-base">{meeting.title}</h4>
                                  <Badge variant="outline" className="text-[10px] border-warning/50 text-warning bg-warning/5 flex-shrink-0 group-hover:bg-warning/10 transition-colors">
                                    Pending
                                  </Badge>
                                </div>
                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-warning/10 group-hover:bg-warning/20 transition-colors">
                                      <Calendar className="h-3 w-3 text-warning" />
                                    </div>
                                    <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-warning/10 group-hover:bg-warning/20 transition-colors">
                                      <PenTool className="h-3 w-3 text-warning" />
                                    </div>
                                    <span className="font-medium">{meeting.signature_requests?.length || 0} signature(s) pending</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <div className="p-2 rounded-full bg-warning/10 group-hover:bg-warning group-hover:text-white transition-all duration-200">
                                  <ChevronRight className="h-5 w-5 text-warning group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                                <span className="text-[10px] font-medium text-warning opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Sign-off Approved */}
            <Card className="border-0 bg-gradient-to-br from-background to-secondary/5 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 shadow-md">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Signature Approved</CardTitle>
                      <CardDescription>Fully signed and approved</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1 bg-secondary/10 text-secondary">
                    {categorizedMeetings.signoff_approved.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {categorizedMeetings.signoff_approved.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 rounded-full bg-secondary/10 mb-3">
                        <CheckCircle2 className="h-10 w-10 text-secondary/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No approved sign-offs</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Approved meetings will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categorizedMeetings.signoff_approved.map((meeting) => (
                        <Card 
                          key={meeting.id}
                          className="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-secondary hover:scale-[1.02] active:scale-[0.98] group bg-gradient-to-r from-background via-background to-secondary/5"
                          onClick={() => handleMeetingSelect(meeting.id)}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-secondary/0 via-secondary/5 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <CardContent className="p-4 relative">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold truncate flex-1 group-hover:text-secondary transition-colors text-base">{meeting.title}</h4>
                                  <Badge variant="outline" className="text-[10px] border-secondary/50 text-secondary bg-secondary/5 flex-shrink-0 group-hover:bg-secondary/10 transition-colors">
                                    Approved
                                  </Badge>
                                </div>
                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                                      <Calendar className="h-3 w-3 text-secondary" />
                                    </div>
                                    <span className="font-medium">{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                                      <CheckCircle2 className="h-3 w-3 text-secondary" />
                                    </div>
                                    <span className="font-medium">{meeting.signature_requests?.length || 0} signature(s) completed</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <div className="p-2 rounded-full bg-secondary/10 group-hover:bg-secondary group-hover:text-white transition-all duration-200">
                                  <ChevronRight className="h-5 w-5 text-secondary group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                                <span className="text-[10px] font-medium text-secondary opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Meeting detail view with AI features
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with back button and AI Coach */}
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
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Headphones className="h-4 w-4" />
          Open AI Coach
        </Button>
      </div>

      {/* Meeting Info Card */}
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

      {/* AI Features Tabs */}
      <Tabs defaultValue="intelligence" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
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

      {/* AI Coach Modal */}
      {showAdvisorModal && selectedMeeting && (
        <ExecutiveMeetingAdvisor
          meetingId={selectedMeetingId!}
          isHost={true}
          meetingData={selectedMeeting}
          onClose={() => setShowAdvisorModal(false)}
        />
      )}

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

            <Card className="border-0 bg-gradient-to-br from-background to-pink-500/5 backdrop-blur-xl shadow-lg">
              <CardHeader className="pb-3">
                <div className="p-2.5 w-fit rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg mb-2">
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
