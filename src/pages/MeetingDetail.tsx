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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { LiveTranscription } from "@/components/LiveTranscription";
import { ContextPanel } from "@/components/ContextPanel";
import { GenerateMinutesDialog } from "@/components/GenerateMinutesDialog";
import { AgendaIntakeForm } from "@/components/AgendaIntakeForm";
import { AIIntelligencePanel } from "@/components/AIIntelligencePanel";
import { AdvancedIntelligencePanel } from "@/components/AdvancedIntelligencePanel";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
  const completedItems = agendaItems.filter((item) => item.status === "completed").length;
  const progress = (completedItems / agendaItems.length) * 100;
  
  const meetingId = id || "demo-meeting-id";
  const { 
    isRecording, 
    isPaused, 
    startRecording, 
    stopRecording, 
    pauseRecording, 
    resumeRecording 
  } = useAudioRecorder(meetingId);

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
                  Executive Strategy Review
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
                    <span>Board Room</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Meeting Controls */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-sm font-medium">Meeting in progress</p>
                <p className="text-xs text-muted-foreground">
                  {completedItems} of {agendaItems.length} agenda items completed
                </p>
              </div>
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button onClick={startRecording} className="gap-2">
                    <Mic className="h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button onClick={resumeRecording} variant="outline" className="gap-2">
                        <Play className="h-4 w-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button onClick={pauseRecording} variant="outline" className="gap-2">
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                    )}
                    <Button onClick={stopRecording} variant="destructive" className="gap-2">
                      <Square className="h-4 w-4" />
                      Stop Recording
                    </Button>
                  </>
                )}
                <Button variant="outline" className="gap-2">
                  <Video className="h-4 w-4" />
                  Join Video
                </Button>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Transcription & Agenda */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="transcription" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="transcription">Live Transcription</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="advanced-intelligence">Advanced Intelligence</TabsTrigger>
              </TabsList>

              <TabsContent value="transcription" className="space-y-4">
                <LiveTranscription meetingId={meetingId} isRecording={isRecording} />
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
                    {agendaItems.map((item, index) => (
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
                        {index < agendaItems.length - 1 && <Separator />}
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

            </Tabs>
          </div>

          {/* Sidebar - Context Panel & Attendees */}
          <div className="space-y-6">
            <ContextPanel meetingId={meetingId} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendees ({attendees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendees.map((attendee) => (
                    <div key={attendee.role} className="flex items-center gap-3">
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
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  View Previous Minutes
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  Reschedule Meeting
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />
                  Manage Attendees
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
      </div>
    </Layout>
  );
};

export default MeetingDetail;
