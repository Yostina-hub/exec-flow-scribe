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
    upcoming: meetings.filter(m => categorizeMeeting(m) === 'upcoming'),
    completed: meetings.filter(m => categorizeMeeting(m) === 'completed'),
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

  // Meeting list view
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

        {/* Signature Requests */}
        <ExecutiveSignatureRequests />

        {/* Categorized Meetings Selection */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-display font-bold">Select Meeting for AI Analysis</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No meetings found</p>
                <p className="text-sm text-muted-foreground/70">Create a meeting to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Meetings */}
              <Card className="border-0 bg-gradient-to-br from-background to-primary/5 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-md">
                        <CalendarCheck className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
                        <CardDescription>Scheduled and future meetings</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {categorizedMeetings.upcoming.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {categorizedMeetings.upcoming.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground/60">
                        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No upcoming meetings</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categorizedMeetings.upcoming.map((meeting) => (
                          <Card 
                            key={meeting.id}
                            className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50 border-l-4 border-l-primary"
                            onClick={() => handleMeetingSelect(meeting.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-2 truncate">{meeting.title}</h4>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.start_time ? format(new Date(meeting.start_time), 'p') : 'TBD'}</span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
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
              <Card className="border-0 bg-gradient-to-br from-background to-success/5 shadow-lg">
                <CardHeader className="pb-4">
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
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {categorizedMeetings.completed.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {categorizedMeetings.completed.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground/60">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No completed meetings</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categorizedMeetings.completed.map((meeting) => (
                          <Card 
                            key={meeting.id}
                            className="hover:shadow-md transition-all cursor-pointer hover:border-success/50 border-l-4 border-l-success"
                            onClick={() => handleMeetingSelect(meeting.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold mb-2 truncate">{meeting.title}</h4>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.start_time ? format(new Date(meeting.start_time), 'p') : 'TBD'}</span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Sign-off Pending */}
              <Card className="border-0 bg-gradient-to-br from-background to-warning/5 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-warning to-warning/80 shadow-md">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Sign-off Pending</CardTitle>
                        <CardDescription>Awaiting signature approval</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {categorizedMeetings.signoff_pending.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {categorizedMeetings.signoff_pending.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground/60">
                        <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No pending sign-offs</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categorizedMeetings.signoff_pending.map((meeting) => (
                          <Card 
                            key={meeting.id}
                            className="hover:shadow-md transition-all cursor-pointer hover:border-warning/50 border-l-4 border-l-warning"
                            onClick={() => handleMeetingSelect(meeting.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold truncate flex-1">{meeting.title}</h4>
                                    <Badge variant="outline" className="text-xs border-warning text-warning flex-shrink-0">
                                      Pending
                                    </Badge>
                                  </div>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <PenTool className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.signature_requests?.length || 0} signature(s) pending</span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
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
              <Card className="border-0 bg-gradient-to-br from-background to-secondary/5 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 shadow-md">
                        <PenTool className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Sign-off Approved</CardTitle>
                        <CardDescription>Fully signed and approved</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {categorizedMeetings.signoff_approved.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {categorizedMeetings.signoff_approved.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground/60">
                        <PenTool className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No approved sign-offs</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categorizedMeetings.signoff_approved.map((meeting) => (
                          <Card 
                            key={meeting.id}
                            className="hover:shadow-md transition-all cursor-pointer hover:border-secondary/50 border-l-4 border-l-secondary"
                            onClick={() => handleMeetingSelect(meeting.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold truncate flex-1">{meeting.title}</h4>
                                    <Badge variant="outline" className="text-xs border-secondary text-secondary flex-shrink-0">
                                      Approved
                                    </Badge>
                                  </div>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                      <span>{meeting.signature_requests?.length || 0} signature(s) completed</span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
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
