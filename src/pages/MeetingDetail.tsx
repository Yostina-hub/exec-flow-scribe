import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Mic,
  MicOff,
  Video,
  Play,
  Pause,
  Square,
  CheckCircle2,
  Circle,
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Loader2,
  Sparkles,
  ListChecks,
  FileSignature,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { LiveTranscription } from "@/components/LiveTranscription";
import { BrowserSpeechRecognition } from "@/components/BrowserSpeechRecognition";
import { ContextPanel } from "@/components/ContextPanel";
import { GenerateMinutesDialog } from "@/components/GenerateMinutesDialog";
import { ViewMinutesDialog } from "@/components/ViewMinutesDialog";
import MeetingChatPanel from "@/components/MeetingChatPanel";
import MeetingStudioPanel from "@/components/MeetingStudioPanel";
import { RescheduleMeetingDialog } from "@/components/RescheduleMeetingDialog";
import { ManageAttendeesDialog } from "@/components/ManageAttendeesDialog";
import { AgendaIntakeForm } from "@/components/AgendaIntakeForm";
import { AIIntelligencePanel } from "@/components/AIIntelligencePanel";
import { AdvancedIntelligencePanel } from "@/components/AdvancedIntelligencePanel";
import { MeetingSignaturesPanel } from "@/components/MeetingSignaturesPanel";
import { CreateSignatureRequestDialog } from "@/components/CreateSignatureRequestDialog";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AgendaItem {
  id: string;
  title: string;
  duration: string;
  presenter: string;
  status: "pending" | "in-progress" | "completed";
}

const agendaItems: AgendaItem[] = [
  {
    id: "1",
    title: "Q4 Performance Review",
    duration: "20 min",
    presenter: "CFO",
    status: "completed",
  },
  {
    id: "2",
    title: "2025 Strategic Initiatives",
    duration: "30 min",
    presenter: "CEO",
    status: "in-progress",
  },
  {
    id: "3",
    title: "Budget Allocation Discussion",
    duration: "25 min",
    presenter: "CFO",
    status: "pending",
  },
  {
    id: "4",
    title: "Team Structure Updates",
    duration: "15 min",
    presenter: "CHRO",
    status: "pending",
  },
];

const attendees = [
  { name: "Chief Executive Officer", initials: "CE", role: "CEO" },
  { name: "Chief Financial Officer", initials: "CF", role: "CFO" },
  { name: "Chief Human Resources Officer", initials: "CH", role: "CHRO" },
  { name: "Chief Marketing Officer", initials: "CM", role: "CMO" },
  { name: "Chief Product Officer", initials: "CP", role: "CPO" },
  { name: "Chief Technology Officer", initials: "CT", role: "CTO" },
  { name: "Chief of Staff", initials: "CS", role: "CoS" },
  { name: "Personal Assistant", initials: "PA", role: "PA" },
];

const decisions = [
  {
    id: "1",
    decision: "Approved Q4 budget reallocation to marketing initiatives",
    timestamp: "2:15 PM",
  },
  {
    id: "2",
    decision: "Agreed to expand engineering team by 15% in Q1 2025",
    timestamp: "2:35 PM",
  },
];

const MeetingDetail = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);
  const [showViewMinutesDialog, setShowViewMinutesDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showManageAttendeesDialog, setShowManageAttendeesDialog] = useState(false);
  const [showCreateSignatureDialog, setShowCreateSignatureDialog] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [meeting, setMeeting] = useState<any>(null);
  const [agendaData, setAgendaData] = useState<AgendaItem[]>(agendaItems);
  const [attendeesData, setAttendeesData] = useState(attendees);
  const [loading, setLoading] = useState(true);
const [wasRecording, setWasRecording] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  
  const meetingId = id || "demo-meeting-id";
  const { 
    isRecording, 
    isPaused, 
    startRecording, 
    stopRecording, 
    pauseRecording, 
    resumeRecording 
  } = useAudioRecorder(meetingId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
    
    if (id) {
      fetchMeetingDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  // Auto-generate minutes when recording stops
  useEffect(() => {
    const autoGenerateMinutes = async () => {
      // Check if recording just stopped (was recording, now not recording)
      if (wasRecording && !isRecording && !isAutoGenerating) {
        setIsAutoGenerating(true);
        
        toast({
          title: 'Processing recording',
          description: 'Automatically generating meeting minutes...',
        });

        try {
          // Auto-save meeting status
          if (id) {
            await supabase
              .from('meetings')
              .update({ 
                status: 'completed',
                actual_end_time: new Date().toISOString()
              })
              .eq('id', id);
          }

// Generate minutes automatically
          const { data, error } = await supabase.functions.invoke('generate-minutes', {
            body: { meetingId, recordingSeconds },
          });

          if (error) throw error;

          toast({
            title: 'Minutes generated',
            description: 'Your meeting minutes are ready to view',
          });

          // Auto-open the view minutes dialog
          setShowViewMinutesDialog(true);
        } catch (error: any) {
          console.error('Error auto-generating minutes:', error);
          const msg = typeof (error?.message) === 'string' ? error.message : (typeof error === 'string' ? error : '');
          const is402 = /Payment required|402/i.test(msg);
          const is429 = /Rate limit|Too Many Requests|429/i.test(msg);
          toast({
            title: is402 ? 'AI credits required' : is429 ? 'Rate limit reached' : 'Auto-generation failed',
            description: is402
              ? 'Please add AI credits in Settings → Workspace → Usage and try again.'
              : is429
              ? 'Too many requests right now. Please wait a minute and retry.'
              : 'You can manually generate minutes from the Actions menu',
            variant: 'destructive',
          });
        } finally {
          setIsAutoGenerating(false);
        }
      }
    };

    autoGenerateMinutes();
    setWasRecording(isRecording);
  }, [isRecording, wasRecording, meetingId, id, toast, isAutoGenerating]);

  const fetchMeetingDetails = async () => {
    try {
      // Fetch meeting with agenda and attendees
      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .select(`
          *,
          agenda_items(*),
          meeting_attendees(
            user_id,
            attended,
            profiles(full_name, email, title)
          )
        `)
        .eq("id", id)
        .single();

      if (meetingError) throw meetingError;

      setMeeting(meetingData);

      // Format agenda items
      if (meetingData.agenda_items && meetingData.agenda_items.length > 0) {
        const formattedAgenda = meetingData.agenda_items.map((item: any) => ({
          id: item.id,
          title: item.title,
          duration: `${item.duration_minutes || 20} min`,
          presenter: item.presenter_id || "TBD",
          status: item.status as "pending" | "in-progress" | "completed",
        }));
        setAgendaData(formattedAgenda);
      }

      // Format attendees
      if (meetingData.meeting_attendees && meetingData.meeting_attendees.length > 0) {
        const formattedAttendees = meetingData.meeting_attendees.map((attendee: any) => {
          const profile = attendee.profiles;
          const name = profile?.full_name || "Unknown";
          const role = profile?.title || profile?.email || "Participant";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);

          return {
            name,
            initials,
            role,
          };
        });
        setAttendeesData(formattedAttendees);
      }
    } catch (error) {
      console.error("Error fetching meeting details:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completedItems = agendaData.filter((item) => item.status === "completed").length;
  const progress = agendaData.length > 0 ? (completedItems / agendaData.length) * 100 : 0;

  const getStatusIcon = (status: AgendaItem["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "in-progress":
        return <Play className="h-5 w-5 text-warning" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Loading meeting details</p>
            <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const meetingTitle = meeting?.title || "Executive Strategy Review";
  const meetingLocation = meeting?.location || "Board Room";

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <a href="/meetings">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Button>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  {meetingTitle}
                </h1>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <Badge variant="warning">In Progress</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>2:00 PM - 3:30 PM (90 min)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{meetingLocation}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.location.href = `/notebook?meeting=${id}`}
                >
                  <Sparkles className="h-4 w-4" />
                  Open in Notebook
                </Button>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Meeting Controls */}
<Card className="border-0 bg-gradient-to-br from-background via-muted/20 to-background backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse" />
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
                    <Mic className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg font-['Space_Grotesk']">Meeting in progress</p>
                    <p className="text-sm text-muted-foreground">
                      {completedItems} of {agendaData.length} agenda items completed
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                {!isRecording ? (
                  <Button 
                    onClick={() => { setRecordingSeconds(0); startRecording(); }} 
                    className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
                  >
                    <Mic className="h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button onClick={resumeRecording} variant="outline" className="gap-2 hover:scale-105 transition-all duration-300">
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button onClick={pauseRecording} variant="outline" className="gap-2 hover:scale-105 transition-all duration-300">
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    <Button onClick={stopRecording} variant="destructive" className="gap-2 hover:scale-105 transition-all duration-300 shadow-lg">
                      <Square className="h-4 w-4" />
                      Stop Recording
                    </Button>
                  </>
                )}
                <Button variant="outline" className="gap-2 hover:scale-105 transition-all duration-300">
                  <Video className="h-4 w-4" />
                  Join Video
                </Button>
              </div>
            </div>
            <div className="mt-4 relative">
              <Progress value={progress} className="h-2" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-full blur-sm animate-pulse pointer-events-none" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Transcription & Agenda */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="transcription" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="transcription">Live Transcription</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="decisions">Decisions</TabsTrigger>
                <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="studio">Studio</TabsTrigger>
                <TabsTrigger value="signatures">Signatures & Audio</TabsTrigger>
              </TabsList>

<TabsContent value="transcription" className="space-y-4">
                <BrowserSpeechRecognition 
                  meetingId={meetingId}
                  externalIsRecording={isRecording}
                  isPaused={isPaused}
                  onRecordingStart={startRecording}
                  onRecordingStop={() => stopRecording()}
                  onDurationChange={(s) => setRecordingSeconds(s)}
                />
              </TabsContent>

              <TabsContent value="agenda" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Meeting Agenda</CardTitle>
                    <CardDescription>
                      Topics and time allocation for this meeting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {agendaData.map((item, index) => (
                      <div key={item.id}>
                        <div className="flex items-start gap-3 py-3">
                          {getStatusIcon(item.status)}
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Presenter: {item.presenter} • {item.duration}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  item.status === "completed"
                                    ? "success"
                                    : item.status === "in-progress"
                                    ? "warning"
                                    : "outline"
                                }
                                className="shrink-0"
                              >
                                {item.status.replace("-", " ")}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {index < agendaData.length - 1 && <Separator />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="decisions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Decisions</CardTitle>
                    <CardDescription>
                      Important decisions made during this meeting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {decisions.map((decision, index) => (
                      <div key={decision.id}>
                        <div className="flex gap-3 py-3">
                          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">{decision.decision}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {decision.timestamp}
                            </p>
                          </div>
                        </div>
                        {index < decisions.length - 1 && <Separator />}
                      </div>
                    ))}
                    {decisions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No decisions recorded yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai-insights" className="space-y-4">
                <AIIntelligencePanel meetingId={meetingId} />
              </TabsContent>

              <TabsContent value="chat" className="space-y-4">
                <MeetingChatPanel meetingId={meetingId} />
              </TabsContent>

              <TabsContent value="studio" className="space-y-4">
                <MeetingStudioPanel meetingId={meetingId} />
              </TabsContent>

              <TabsContent value="signatures" className="space-y-4">
                <MeetingSignaturesPanel meetingId={meetingId} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Context Panel & Attendees */}
          <div className="space-y-6">
            <ContextPanel meetingId={meetingId} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({attendeesData.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendeesData.map((attendee, idx) => (
                    <div key={`${attendee.role}-${idx}`} className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 bg-gradient-to-br from-primary to-secondary">
                        <AvatarFallback className="bg-transparent text-white text-xs">
                          {attendee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{attendee.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attendee.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="default" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowMinutesDialog(true)}
                >
                  <FileText className="h-4 w-4" />
                  Generate AI Minutes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => navigate(`/meetings/${id}/minutes`)}
                  disabled={!meeting?.minutes_url}
                >
                  <FileText className="h-4 w-4" />
                  Open Minutes Editor
                </Button>
                <AgendaIntakeForm
                  meetingId={meetingId}
                  trigger={
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <Plus className="h-4 w-4" />
                      Add Agenda Items
                    </Button>
                  }
                />
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowViewMinutesDialog(true)}
                  disabled={!meeting?.minutes_url}
                >
                  <FileText className="h-4 w-4" />
                  View Previous Minutes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowRescheduleDialog(true)}
                >
                  <Calendar className="h-4 w-4" />
                  Reschedule Meeting
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowManageAttendeesDialog(true)}
                >
                  <Users className="h-4 w-4" />
                  Manage Attendees
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowCreateSignatureDialog(true)}
                >
                  <FileSignature className="h-4 w-4" />
                  Request Sign-Off
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <GenerateMinutesDialog
          meetingId={meetingId}
          open={showMinutesDialog}
          onOpenChange={setShowMinutesDialog}
        />

        <ViewMinutesDialog
          meetingId={meetingId}
          open={showViewMinutesDialog}
          onOpenChange={setShowViewMinutesDialog}
        />

        <RescheduleMeetingDialog
          meetingId={meetingId}
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
          onSuccess={fetchMeetingDetails}
        />

        <ManageAttendeesDialog
          meetingId={meetingId}
          open={showManageAttendeesDialog}
          onOpenChange={setShowManageAttendeesDialog}
          onSuccess={fetchMeetingDetails}
        />

        <CreateSignatureRequestDialog
          meetingId={meetingId}
          open={showCreateSignatureDialog}
          onOpenChange={setShowCreateSignatureDialog}
          onSuccess={() => {
            toast({
              title: 'Success',
              description: 'Signature request created successfully',
            });
          }}
        />
      </div>
    </Layout>
  );
};

export default MeetingDetail;
