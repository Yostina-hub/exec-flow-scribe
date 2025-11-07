import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Mic,
  MicOff,
  Video,
  ExternalLink,
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
  Settings,
  MessageSquare,
  Languages,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { LiveTranscription } from "@/components/LiveTranscription";
import { BrowserSpeechRecognition } from "@/components/BrowserSpeechRecognition";
import { LiveAudioRecorder } from "@/components/LiveAudioRecorder";
import { VirtualMeetingRoom } from "@/components/VirtualMeetingRoom";
import { AudioToMinutesWorkflow } from "@/components/AudioToMinutesWorkflow";
import { JitsiMeetEmbed } from "@/components/JitsiMeetEmbed";
import { GenerateMinutesDialog } from "@/components/GenerateMinutesDialog";
import { ViewMinutesDialog } from "@/components/ViewMinutesDialog";
import MeetingChatPanel from "@/components/MeetingChatPanel";
import MeetingStudioPanel from "@/components/MeetingStudioPanel";
import { RescheduleMeetingDialog } from "@/components/RescheduleMeetingDialog";
import { ManageAttendeesDialog } from "@/components/ManageAttendeesDialog";
import { AgendaIntakeForm } from "@/components/AgendaIntakeForm";
import { AIIntelligencePanel } from "@/components/AIIntelligencePanel";
import { AdvancedIntelligencePanel } from "@/components/AdvancedIntelligencePanel";
import { AIMinutesGenerator } from "@/components/AIMinutesGenerator";
import { DocumentVersionControl } from "@/components/DocumentVersionControl";
import { MultiChannelDistribution } from "@/components/MultiChannelDistribution";
import { IntegrationManager } from "@/components/IntegrationManager";
import { TranscriptionDocumentExport } from "@/components/TranscriptionDocumentExport";
import { MeetingSignaturesPanel } from "@/components/MeetingSignaturesPanel";
import { LazyTabContent } from "@/components/LazyTabContent";
import { MeetingAudioPlayback } from "@/components/MeetingAudioPlayback";
import { CreateSignatureRequestDialog } from "@/components/CreateSignatureRequestDialog";
import { ShareMeetingDialog } from "@/components/ShareMeetingDialog";
import { ParticipantDashboard } from "@/components/ParticipantDashboard";
import { SpeakerQueue } from "@/components/SpeakerQueue";
import { AutoAssignmentControls } from "@/components/AutoAssignmentControls";
import { MeetingAnalytics } from "@/components/MeetingAnalytics";
import { RealTimePresence } from "@/components/RealTimePresence";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { BreakoutRoomsManager } from "@/components/BreakoutRoomsManager";
import { MeetingTemplateManager } from "@/components/MeetingTemplateManager";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { LivePolling } from "@/components/LivePolling";
import { CollaborativeNotes } from "@/components/CollaborativeNotes";
import { MeetingBookmarks } from "@/components/MeetingBookmarks";
import { MeetingSummaryCard } from "@/components/MeetingSummaryCard";
import { MeetingKeyPointsSummary } from "@/components/MeetingKeyPointsSummary";
import { MeetingKeywordSearch } from "@/components/MeetingKeywordSearch";
import { EnhancedDocumentsTab } from "@/components/EnhancedDocumentsTab";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { useMeetingAccess } from "@/hooks/useMeetingAccess";
import { TimeBasedAccessGuard } from "@/components/TimeBasedAccessGuard";
import { ProtectedElement } from "@/components/ProtectedElement";
import { HostManagementPanel } from "@/components/HostManagementPanel";
import { useIsGuest } from "@/hooks/useIsGuest";
import { GuestLayout } from "@/components/GuestLayout";
import { GuestMeetingView } from "@/components/GuestMeetingView";
import { PDFGenerationPanel } from "@/components/PDFGenerationPanel";
import { SystemTestPanel } from "@/components/SystemTestPanel";
import { TranscriptionProviderToggle } from "@/components/TranscriptionProviderToggle";
import { useRealtimeMeetingData } from "@/hooks/useRealtimeMeetingData";
import { useRealtimeAgenda } from "@/hooks/useRealtimeAgenda";
import { useRealtimeTranscriptions } from "@/hooks/useRealtimeTranscriptions";

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
  const { theme } = useTheme();
  const isEthioTelecom = theme === 'ethio-telecom';
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);
  const [showViewMinutesDialog, setShowViewMinutesDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showManageAttendeesDialog, setShowManageAttendeesDialog] = useState(false);
  const [showCreateSignatureDialog, setShowCreateSignatureDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showVirtualRoom, setShowVirtualRoom] = useState(false);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userFullName, setUserFullName] = useState<string>("");
  const [meeting, setMeeting] = useState<any>(null);
  const [isVirtualRoomMeeting, setIsVirtualRoomMeeting] = useState(false);
  const [agendaData, setAgendaData] = useState<AgendaItem[]>(agendaItems);
  const [attendeesData, setAttendeesData] = useState(attendees);
  const [loading, setLoading] = useState(true);
  const wasRecordingRef = useRef(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [meetingPhase, setMeetingPhase] = useState<'pre' | 'active' | 'post'>('pre');
  const [spatialView, setSpatialView] = useState(false);
  const [activeTab, setActiveTab] = useState('transcription');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('am-ET');
  const hasRestoredRecordingRef = useRef(false);
  
  const meetingId = id || "demo-meeting-id";
  
  // Realtime data hooks
  const { agenda: realtimeAgenda } = useRealtimeAgenda(meetingId);
  const { transcriptions: realtimeTranscriptions } = useRealtimeTranscriptions(meetingId);
  
  const meetingAccess = useMeetingAccess(id);
  const { isGuest, guestName, loading: guestLoading } = useIsGuest(id);
  const { 
    isRecording, 
    isPaused, 
    startRecording, 
    stopRecording, 
    pauseRecording, 
    resumeRecording 
  } = useAudioRecorder(meetingId);

  // Real-time updates for meeting data
  useEffect(() => {
    if (!id) return;
    
    const channel = supabase
      .channel(`meeting-${id}-updates`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${id}`
        },
        () => {
          fetchMeetingDetails();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_attendees',
          filter: `meeting_id=eq.${id}`
        },
        () => {
          fetchMeetingDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Get user's full name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserFullName(profile.full_name || "User");
        }
      }
    };
    getUser();
    
    if (id) {
      fetchMeetingDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      // Reset recording time tracking
      recordingStartTimeRef.current = null;
      pausedDurationRef.current = 0;
      pauseStartTimeRef.current = null;
    };
  }, []);

  // Restore active recording when returning to this page
  useEffect(() => {
    if (!meetingId || !userId || hasRestoredRecordingRef.current) return;
    
    const checkAndRestoreRecording = async () => {
      try {
        const recordingKey = `meeting-recording-${meetingId}`;
        const savedRecording = localStorage.getItem(recordingKey);
        
        if (savedRecording) {
          const recordingData = JSON.parse(savedRecording);
          
          // Only restore if recording is actually active and user is the host
          if (recordingData.isRecording && meeting?.created_by === userId) {
            console.log('Found active recording, restoring state...');
            
            // Restore the recording timestamps
            recordingStartTimeRef.current = recordingData.startTime;
            pausedDurationRef.current = recordingData.pausedDuration || 0;
            
            // Calculate current duration for display
            if (recordingData.startTime) {
              const elapsed = Date.now() - recordingData.startTime;
              const pausedDuration = recordingData.pausedDuration || 0;
              const currentSeconds = Math.floor((elapsed - pausedDuration) / 1000);
              setRecordingSeconds(currentSeconds);
            }
            
            // Auto-restart recording to resume audio capture
            if (!isRecording) {
              console.log('Restarting recording to resume audio capture');
              hasRestoredRecordingRef.current = true;
              await startRecording();
              
              toast({
                title: 'Recording Resumed',
                description: 'Your recording session has been restored',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error restoring recording:', error);
      }
    };
    
    // Small delay to ensure meeting data is loaded
    const timer = setTimeout(checkAndRestoreRecording, 500);
    return () => clearTimeout(timer);
  }, [meetingId, userId, meeting, startRecording, toast]);

  // Load recording state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`recording-${meetingId}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.isRecording && state.startTime) {
          recordingStartTimeRef.current = state.startTime;
          pausedDurationRef.current = state.pausedDuration || 0;
          pauseStartTimeRef.current = state.pauseStartTime || null;
        }
      } catch (e) {
        console.error('Failed to load recording state:', e);
      }
    }
  }, [meetingId]);

  // Persist recording state to localStorage and sync across tabs
  useEffect(() => {
    if (isRecording) {
      const state = {
        isRecording: true,
        startTime: recordingStartTimeRef.current,
        pausedDuration: pausedDurationRef.current,
        pauseStartTime: pauseStartTimeRef.current,
        timestamp: Date.now(),
      };
      localStorage.setItem(`recording-${meetingId}`, JSON.stringify(state));
    } else {
      localStorage.removeItem(`recording-${meetingId}`);
    }
  }, [isRecording, meetingId]);

  // Sync recording state across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `recording-${meetingId}` && e.newValue) {
        try {
          const state = JSON.parse(e.newValue);
          if (state.isRecording && state.startTime) {
            recordingStartTimeRef.current = state.startTime;
            pausedDurationRef.current = state.pausedDuration || 0;
            pauseStartTimeRef.current = state.pauseStartTime || null;
            console.log('Synced recording state from another tab');
          }
        } catch (e) {
          console.error('Failed to sync recording state:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [meetingId]);

  // Track recording time with timestamp-based approach (works even when tab is inactive)
  useEffect(() => {
    if (isRecording && !isPaused) {
      // Start recording - set start time if not already set
      if (recordingStartTimeRef.current === null) {
        recordingStartTimeRef.current = Date.now();
        pausedDurationRef.current = 0;
        console.log('Recording started at:', new Date(recordingStartTimeRef.current).toISOString());
      }
      
      // If resuming from pause, calculate pause duration
      if (pauseStartTimeRef.current !== null) {
        const pauseDuration = Date.now() - pauseStartTimeRef.current;
        pausedDurationRef.current += pauseDuration;
        pauseStartTimeRef.current = null;
        console.log('Resumed - total pause duration:', pausedDurationRef.current / 1000, 'seconds');
      }
      
      // Update timer every 100ms for smooth display
      const updateTimer = () => {
        if (recordingStartTimeRef.current !== null) {
          const elapsed = Date.now() - recordingStartTimeRef.current - pausedDurationRef.current;
          const seconds = Math.floor(elapsed / 1000);
          setRecordingSeconds(seconds);
          
          // Update localStorage every second for the floating indicator
          if (seconds % 1 === 0) {
            try {
              localStorage.setItem(
                `meeting-recording-${meetingId}`,
                JSON.stringify({
                  isRecording: true,
                  startTime: recordingStartTimeRef.current,
                  pausedDuration: pausedDurationRef.current,
                })
              );
            } catch (e) {
              console.error('Failed to update recording state:', e);
            }
          }
        }
      };
      
      updateTimer(); // Initial update
      recordingTimerRef.current = setInterval(updateTimer, 100);
      
    } else if (isRecording && isPaused) {
      // Recording paused - mark pause start time
      if (pauseStartTimeRef.current === null) {
        pauseStartTimeRef.current = Date.now();
        console.log('Recording paused at:', new Date(pauseStartTimeRef.current).toISOString());
      }
      
      // Clear timer during pause
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } else {
      // Recording stopped - clear timer and reset
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Reset time tracking when recording stops
      if (!isRecording) {
        recordingStartTimeRef.current = null;
        pausedDurationRef.current = 0;
        pauseStartTimeRef.current = null;
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  // Reset recording seconds and timestamps when recording starts fresh (but not when resuming)
  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      // Only reset if we don't have a restored recording session
      const recordingKey = `meeting-recording-${meetingId}`;
      const savedRecording = localStorage.getItem(recordingKey);
      
      if (!savedRecording || !hasRestoredRecordingRef.current) {
        setRecordingSeconds(0);
        recordingStartTimeRef.current = Date.now();
        pausedDurationRef.current = 0;
        pauseStartTimeRef.current = null;
        console.log('Fresh recording started - reset all timers');
      } else {
        console.log('Resuming existing recording - preserving timestamps');
      }
      
      wasRecordingRef.current = true;
    } else if (!isRecording && wasRecordingRef.current) {
      // Only reset flag when recording stops, but don't update wasRecordingRef here
      // Let the auto-generate useEffect handle wasRecordingRef to detect the transition
      hasRestoredRecordingRef.current = false;
    }
  }, [isRecording, meetingId]);

  // Auto-generate minutes when recording stops
  useEffect(() => {
    const autoGenerateMinutes = async () => {
      const wasRecording = wasRecordingRef.current;
      
      console.log('Auto-gen check:', { wasRecording, isRecording, isAutoGenerating, recordingSeconds, isVirtualRoomMeeting });
      
      // Skip auto-generation for virtual room meetings - they handle it internally
      if (isVirtualRoomMeeting) {
        wasRecordingRef.current = isRecording;
        return;
      }
      
      // Check if recording just stopped (was recording, now not recording)
      if (wasRecording && !isRecording && !isAutoGenerating) {
        setIsAutoGenerating(true);
        
        console.log('Starting auto-generation of minutes...');
        
        toast({
          title: '🚀 Generating Minutes',
          description: 'Using fast AI model for quick results...',
        });

        try {
          // Get auth session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');

          // Removed delay - generate immediately for better performance
          // Transcriptions are already saved by the recording component

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

          console.log('Calling generate-minutes function...');

          // Generate minutes automatically
          const { data, error } = await supabase.functions.invoke('generate-minutes', {
            body: { meetingId, recordingSeconds },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (error) {
            console.error('Edge function invoke error:', error);
            throw error;
          }

          if (data?.error) {
            console.error('Edge function data error:', data.error);
            
            // The backend now returns detailed user-friendly error messages
            // Extract the main message (before any technical details)
            const errorMsg = typeof data.error === 'string' 
              ? data.error.split('\n\n📋')[0].split('\n\nTip:')[0] // Get the main message
              : 'Failed to generate minutes';
            
            throw new Error(errorMsg);
          }

          console.log('Minutes generated successfully!');

          toast({
            title: '✨ Minutes Ready',
            description: 'Your meeting minutes have been generated',
          });

          // Auto-open the minutes viewer so users see the result immediately
          setShowViewMinutesDialog(true);
        } catch (error: any) {
          console.error('Error auto-generating minutes:', error);
          
          // Extract error message
          const msg = typeof error?.message === 'string' 
            ? error.message 
            : typeof error === 'string' 
            ? error 
            : 'Failed to generate minutes';
          
          // Check for specific error types
          const is402 = /Payment required|💳|402/i.test(msg);
          const is429 = /Rate limit|⏳|Too Many Requests|429/i.test(msg);
          
          // For rate limit errors, show the full helpful message from backend
          if (is429) {
            toast({
              title: '⏳ Rate Limit Reached',
              description: 'All AI providers are temporarily rate limited. Please wait 2-3 minutes and try generating minutes again from the Actions menu.',
              variant: 'destructive',
              duration: 8000, // Show longer for rate limit messages
            });
          } else if (is402) {
            toast({
              title: '💳 AI Credits Required',
              description: 'Please add credits in Settings → Workspace → Usage, or add your own AI API keys in Settings.',
              variant: 'destructive',
              duration: 8000,
            });
          } else {
            // Show the error message from backend (already user-friendly)
            toast({
              title: 'Auto-generation failed',
              description: msg || 'You can manually generate minutes from the Actions menu.',
              variant: 'destructive',
              duration: 6000,
            });
          }
        } finally {
          setIsAutoGenerating(false);
        }
      }
      
      // Update ref for next comparison
      wasRecordingRef.current = isRecording;
    };

    autoGenerateMinutes();
  }, [isRecording, meetingId, id, toast, isAutoGenerating, recordingSeconds, isVirtualRoomMeeting]);

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
            profiles:user_id(full_name, email, title)
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (meetingError) throw meetingError;

      setMeeting(meetingData);

      // Set active tab based on meeting type
      if ((meetingData.meeting_type === 'video_conference' || meetingData.meeting_type === 'virtual_room') && 
          (meetingData.video_conference_url || meetingData.meeting_type === 'virtual_room')) {
        setActiveTab('video');
      } else {
        setActiveTab('transcription');
      }

      // Check if this is a virtual room meeting - auto-open virtual room
      if (meetingData.meeting_type === 'virtual_room') {
        setIsVirtualRoomMeeting(true);
        setShowVirtualRoom(true);
      }

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

  if (loading || guestLoading) {
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

  // Guest users get a completely different experience
  if (isGuest && userId) {
    return (
      <GuestLayout guestName={guestName}>
        <GuestMeetingView meetingId={meetingId} userId={userId} />
      </GuestLayout>
    );
  }

  // For virtual room type meetings, ONLY show virtual room interface - no standard meeting UI
  if (isVirtualRoomMeeting && meeting && userId) {
    return (
      <VirtualMeetingRoom
        meetingId={meetingId}
        isHost={meeting.created_by === userId}
        currentUserId={userId}
        onCloseRoom={() => navigate('/meetings')}
      />
    );
  }

  // Check if meeting is completed - prevent rejoining
  const isMeetingCompleted = meeting?.status === 'completed';
  
  // Show Virtual Meeting Room for standard meetings that opt to use virtual room
  if (showVirtualRoom && meeting && userId) {
    if (isMeetingCompleted) {
      toast({
        title: "Meeting Ended",
        description: "This meeting has been completed and closed by the host",
        variant: "destructive",
      });
      setShowVirtualRoom(false);
      return null;
    }
    
    // For virtual_room type meetings, don't allow closing back to standard view
    const handleClose = isVirtualRoomMeeting 
      ? () => navigate('/meetings') 
      : () => setShowVirtualRoom(false);
    
    return (
      <VirtualMeetingRoom
        meetingId={meetingId}
        isHost={meeting.created_by === userId}
        currentUserId={userId}
        onCloseRoom={handleClose}
      />
    );
  }


  // Show Host Management Panel
  if (showHostPanel && meeting && userId && meeting.created_by === userId) {
    return (
      <HostManagementPanel
        meetingId={meetingId}
        onLaunchRoom={() => setShowVirtualRoom(true)}
      />
    );
  }

  // For virtual_room meetings that haven't shown the room yet, show it immediately
  // This prevents showing standard meeting interface for virtual_room types
  if (isVirtualRoomMeeting && !showVirtualRoom && meeting && userId && !isMeetingCompleted) {
    setShowVirtualRoom(true);
    return null; // Will re-render with virtual room
  }

  const meetingTitle = meeting?.title || "Executive Strategy Review";
  const meetingLocation = meeting?.location || "Board Room";
  const isOnlineMeeting = meeting?.meeting_type === 'online' || meeting?.meeting_type === 'hybrid';
  const hasVideoLink = !!meeting?.video_conference_url;

  return (
    <Layout>
      <TimeBasedAccessGuard meetingId={meetingId}>
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
                {/* Participants - Direct Join Virtual Room Button */}
                {meeting?.created_by !== userId && meeting?.status !== 'completed' && (
                  <Button
                    className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
                    onClick={() => setShowVirtualRoom(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Join Virtual Room
                  </Button>
                )}
                
                {meeting?.status === 'completed' && (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Meeting Completed
                  </Badge>
                )}
                
                {(meeting.meeting_type === 'video_conference' && meeting.video_conference_url) && (
                  <Button
                    className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    onClick={() => window.open(meeting.video_conference_url, '_blank')}
                  >
                    <Video className="h-4 w-4" />
                    Join Video Call
                  </Button>
                )}
                {meeting.meeting_type === 'virtual_room' && (
                  <Button
                    className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    onClick={() => setShowVirtualRoom(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Join Virtual Room
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Share Meeting
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 hover-scale transition-all"
                  onClick={() => window.location.href = `/notebook?meeting=${id}`}
                >
                  <Sparkles className="h-4 w-4" />
                  Open in Notebook
                </Button>
                
                {/* Host-only 3-dot menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {meeting?.created_by === userId && meeting?.status !== 'completed' && (
                      <DropdownMenuItem onClick={async () => {
                        if (!id) return;
                        try {
                          await supabase
                            .from('meetings')
                            .update({ 
                              status: 'completed',
                              actual_end_time: new Date().toISOString()
                            })
                            .eq('id', id);
                          
                          toast({
                            title: 'Meeting completed',
                            description: 'Minutes will be auto-generated if transcription is available',
                          });
                          
                          // Refresh meeting data
                          fetchMeetingDetails();
                        } catch (error) {
                          console.error('Error completing meeting:', error);
                          toast({
                            title: 'Error',
                            description: 'Failed to complete meeting',
                            variant: 'destructive',
                          });
                        }
                      }}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete Meeting
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowMinutesDialog(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Minutes
                    </DropdownMenuItem>
                    {meeting?.created_by === userId && (
                      <DropdownMenuItem onClick={() => setShowRescheduleDialog(true)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Reschedule Meeting
                      </DropdownMenuItem>
                    )}
                    {meeting?.created_by === userId && (
                      <DropdownMenuItem onClick={() => setShowManageAttendeesDialog(true)}>
                        <Users className="h-4 w-4 mr-2" />
                        Manage Attendees
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setShowViewMinutesDialog(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Previous Minutes
                    </DropdownMenuItem>
                    {meeting?.created_by === userId && (
                      <>
                        <DropdownMenuItem onClick={() => setShowVirtualRoom(true)}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          🌐 Launch Virtual Room
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowHostPanel(true)}>
                          <Settings className="h-4 w-4 mr-2" />
                          🎛️ Host Management Panel
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
              <div className="flex gap-3 flex-wrap">
                {!isRecording ? (
                  <Button 
                    onClick={() => { 
                      setRecordingSeconds(0);
                      recordingStartTimeRef.current = null;
                      pausedDurationRef.current = 0;
                      pauseStartTimeRef.current = null;
                      startRecording(); 
                    }} 
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
                    <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded-lg border">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-mono font-semibold tabular-nums">
                        {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </>
                )}
                {meeting.meeting_type === 'video_conference' && meeting.video_conference_url && (
                  <Button 
                    className="gap-2 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500"
                    onClick={() => window.open(meeting.video_conference_url, '_blank')}
                  >
                    <Video className="h-4 w-4" />
                    Join Video
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 relative">
              <Progress value={progress} className="h-2" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-full blur-sm animate-pulse pointer-events-none" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-6">
          <Tabs
              defaultValue={(meeting.meeting_type === 'video_conference' || meeting.meeting_type === 'virtual_room') && (meeting.video_conference_url || meeting.meeting_type === 'virtual_room') ? "video" : "transcription"} 
              className="w-full"
              onValueChange={(value) => setActiveTab(value)}
            >
              <div className="w-full overflow-x-auto pb-2">
                <TabsList className={`inline-flex w-auto min-w-full h-auto p-1 gap-1 ${isEthioTelecom ? 'bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm' : ''}`}>
                {(meeting.meeting_type === 'video_conference' || meeting.meeting_type === 'virtual_room') && (meeting.video_conference_url || meeting.meeting_type === 'virtual_room') && (
                  <TabsTrigger value="video" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                    <Video className="h-4 w-4" />
                    {meeting.meeting_type === 'virtual_room' ? 'Virtual Room' : 'Video Call'}
                  </TabsTrigger>
                )}
                <TabsTrigger value="participants" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <Users className="h-4 w-4" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="transcription" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <Mic className="h-4 w-4" />
                  Live Transcription
                </TabsTrigger>
                <TabsTrigger value="agenda" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <ListChecks className="h-4 w-4" />
                  Agenda
                </TabsTrigger>
                <TabsTrigger value="decisions" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  Decisions
                </TabsTrigger>
                <TabsTrigger value="collaboration" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <MessageSquare className="h-4 w-4" />
                  Collaboration
                </TabsTrigger>
                <TabsTrigger value="documents" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <FileText className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="signatures" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <FileSignature className="h-4 w-4" />
                  Audio to Minutes
                </TabsTrigger>
                <TabsTrigger value="chat" className={`gap-2 ${isEthioTelecom ? 'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground' : ''}`}>
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
              </TabsList>
              </div>

              {(meeting.meeting_type === 'video_conference' || meeting.meeting_type === 'virtual_room') && (meeting.video_conference_url || meeting.meeting_type === 'virtual_room') && (
                <TabsContent value="video" className="space-y-4">
                  {meeting.meeting_type === 'video_conference' && meeting.video_conference_url && (
                    <JitsiMeetEmbed
                      roomName={meeting.video_conference_url.split('/').pop() || 'meeting-room'}
                      displayName={userFullName}
                      meetingId={id}
                      autoStartRecording={isRecording}
                      onRecordingStart={() => {
                        console.log('Jitsi recording started');
                        toast({
                          title: 'Conference Recording Started',
                          description: 'Full conference audio will be captured and transcribed',
                        });
                      }}
                      onRecordingStop={() => {
                        console.log('Jitsi recording stopped');
                        toast({
                          title: 'Conference Recording Stopped',
                          description: 'Processing recording for transcription...',
                        });
                      }}
                      onMeetingEnd={() => {
                        console.log('Jitsi meeting ended');
                        toast({
                          title: 'Meeting Ended',
                          description: 'Video conference has ended',
                        });
                      }}
                    />
                  )}
                  {meeting.meeting_type === 'virtual_room' && (
                    <VirtualMeetingRoom 
                      meetingId={id!} 
                      isHost={meeting.created_by === userId}
                      currentUserId={userId || ''}
                    />
                  )}
                </TabsContent>
              )}

              <TabsContent value="participants" className="space-y-4">
                <div className="space-y-4">
                  {userId && userFullName && (
                    <RealTimePresence
                      meetingId={meetingId}
                      currentUserId={userId}
                      currentUserName={userFullName}
                    />
                  )}
                  {meeting?.created_by === userId && (
                    <AutoAssignmentControls
                      meetingId={meetingId}
                      isHost={true}
                    />
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <ParticipantDashboard
                      meetingId={meetingId}
                      isHost={meeting?.created_by === userId}
                      currentUserId={userId || ''}
                    />
                    <SpeakerQueue
                      meetingId={meetingId}
                      isHost={meeting?.created_by === userId}
                      currentUserId={userId || ''}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Keep mounted but hidden to preserve state - with sidebar layout */}
              <div className={activeTab === 'transcription' ? 'block' : 'hidden'}>
                <ProtectedElement meetingId={meetingId} elementType="transcriptions">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-4">
                      <BrowserSpeechRecognition
                        meetingId={meetingId}
                        externalIsRecording={isRecording}
                        isPaused={isPaused}
                        onRecordingStart={startRecording}
                        onRecordingStop={() => stopRecording()}
                        onDurationChange={(s) => setRecordingSeconds(s)}
                        selectedLanguage={transcriptionLanguage}
                      />
                      <MeetingAudioPlayback meetingId={meetingId} />
                      <LiveTranscription 
                        meetingId={meetingId} 
                        isRecording={isRecording}
                        currentUserName={userFullName || 'Unknown User'}
                      />
                    </div>

                    {/* Right Sidebar - Settings & Quick Actions */}
                    <div className="lg:col-span-1 space-y-4">
                      {/* Transcription Controls */}
                      {meeting?.created_by === userId && (
                        <>
                          <Card className="border-primary/20">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Languages className="h-4 w-4 text-primary" />
                                Language Selection
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Select
                                value={transcriptionLanguage}
                                onValueChange={setTranscriptionLanguage}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="am-ET">Amharic (አማርኛ)</SelectItem>
                                  <SelectItem value="en-US">English (US)</SelectItem>
                                  <SelectItem value="en-GB">English (UK)</SelectItem>
                                  <SelectItem value="ar-SA">Arabic (العربية)</SelectItem>
                                  <SelectItem value="es-ES">Spanish (Español)</SelectItem>
                                  <SelectItem value="fr-FR">French (Français)</SelectItem>
                                  <SelectItem value="de-DE">German (Deutsch)</SelectItem>
                                  <SelectItem value="zh-CN">Chinese (中文)</SelectItem>
                                  <SelectItem value="ja-JP">Japanese (日本語)</SelectItem>
                                  <SelectItem value="ko-KR">Korean (한국어)</SelectItem>
                                  <SelectItem value="hi-IN">Hindi (हिन्दी)</SelectItem>
                                  <SelectItem value="sw-KE">Swahili (Kiswahili)</SelectItem>
                                  <SelectItem value="so-SO">Somali (Soomaali)</SelectItem>
                                  <SelectItem value="om-ET">Oromo (Oromoo)</SelectItem>
                                </SelectContent>
                              </Select>
                            </CardContent>
                          </Card>
                          
                          <TranscriptionProviderToggle />
                        </>
                      )}
                      
                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {/* AI-Powered Summary & Search */}
                            <div className="space-y-2">
                              <MeetingKeyPointsSummary meetingId={meetingId} />
                              <MeetingKeywordSearch meetingId={meetingId} />
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-2">
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </ProtectedElement>
              </div>

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


              <TabsContent value="collaboration" className="space-y-6">
                <LazyTabContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LivePolling 
                      meetingId={meetingId} 
                      isHost={meeting?.created_by === userId} 
                    />
                    <CollaborativeNotes meetingId={meetingId} />
                  </div>
                  <MeetingBookmarks meetingId={meetingId} />
                </LazyTabContent>
              </TabsContent>


              <TabsContent value="advanced" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BreakoutRoomsManager 
                    meetingId={meetingId} 
                    isHost={meeting?.created_by === userId} 
                  />
                  <div className="space-y-6">
                    <MeetingTemplateManager />
                    <NotificationPreferences />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <LazyTabContent>
                  <ProtectedElement meetingId={meetingId} elementType="documents">
                    <EnhancedDocumentsTab 
                      meetingId={meetingId}
                      meetingTitle={meeting?.title || 'Meeting'}
                    />
                    <div className="mt-6">
                      <Card className={isEthioTelecom ? 'border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background' : ''}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Document Management & Distribution
                          </CardTitle>
                          <CardDescription>
                            Manage document distribution and integrations
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <MultiChannelDistribution meetingId={meetingId} />
                          <IntegrationManager meetingId={meetingId} />
                        </CardContent>
                      </Card>
                    </div>
                  </ProtectedElement>
                </LazyTabContent>
              </TabsContent>



              <TabsContent value="chat" className="space-y-4">
                <MeetingChatPanel meetingId={meetingId} />
              </TabsContent>

              <TabsContent value="signatures" className="space-y-4">
                <LazyTabContent>
                  <AudioToMinutesWorkflow meetingId={meetingId} />
                </LazyTabContent>
              </TabsContent>
            </Tabs>

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

        {meeting && (
          <ShareMeetingDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            meetingId={meeting.id}
            meetingTitle={meeting.title}
            meetingDate={meeting.start_time ? format(new Date(meeting.start_time), 'PPP') : 'TBD'}
            meetingTime={meeting.start_time ? format(new Date(meeting.start_time), 'p') : 'TBD'}
            videoConferenceUrl={meeting.video_conference_url}
          />
        )}
      </div>
      </TimeBasedAccessGuard>
    </Layout>
  );
};

export default MeetingDetail;
