import { Button } from "@/components/ui/button";
import { MeetingDetailSkeleton } from "@/components/skeletons/MeetingDetailSkeleton";
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
  Sparkles,
  ListChecks,
  FileSignature,
  Settings,
  MessageSquare,
  Languages,
  Heart,
  Brain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useChapterDetection } from "@/hooks/useChapterDetection";
import { useState, useEffect, useRef, lazy, Suspense, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { useMeetingAccess } from "@/hooks/useMeetingAccess";
import { useRealtimeTranscriptions } from "@/hooks/useRealtimeTranscriptions";
import { useAuth } from "@/hooks/useAuth";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { localStorageCache } from "@/utils/localStorage";
import { LiveMeetingStatusBar } from "@/components/LiveMeetingStatusBar";
import { AISummaryStrip } from "@/components/AISummaryStrip";
import { ChapterTimeline } from "@/components/ChapterTimeline";
import { LiveTranscriptPanel } from "@/components/LiveTranscriptPanel";
import { MeetingRightDock } from "@/components/MeetingRightDock";
import { LiveTranscriptionModal } from "@/components/LiveTranscriptionModal";

// Lazy load heavy components
const LiveTranscription = lazy(() => import("@/components/LiveTranscription").then(m => ({ default: m.LiveTranscription })));
const BrowserSpeechRecognition = lazy(() => import("@/components/BrowserSpeechRecognition").then(m => ({ default: m.BrowserSpeechRecognition })));
const LiveAudioRecorder = lazy(() => import("@/components/LiveAudioRecorder").then(m => ({ default: m.LiveAudioRecorder })));
const VirtualMeetingRoom = lazy(() => import("@/components/VirtualMeetingRoom").then(m => ({ default: m.VirtualMeetingRoom })));
const AudioToMinutesWorkflow = lazy(() => import("@/components/AudioToMinutesWorkflow").then(m => ({ default: m.AudioToMinutesWorkflow })));
const JitsiMeetEmbed = lazy(() => import("@/components/JitsiMeetEmbed").then(m => ({ default: m.JitsiMeetEmbed })));
const GenerateMinutesDialog = lazy(() => import("@/components/GenerateMinutesDialog").then(m => ({ default: m.GenerateMinutesDialog })));
const ViewMinutesDialog = lazy(() => import("@/components/ViewMinutesDialog").then(m => ({ default: m.ViewMinutesDialog })));
const MeetingChatPanel = lazy(() => import("@/components/MeetingChatPanel"));
const MeetingStudioPanel = lazy(() => import("@/components/MeetingStudioPanel"));
const RescheduleMeetingDialog = lazy(() => import("@/components/RescheduleMeetingDialog").then(m => ({ default: m.RescheduleMeetingDialog })));
const ManageAttendeesDialog = lazy(() => import("@/components/ManageAttendeesDialog").then(m => ({ default: m.ManageAttendeesDialog })));
const AgendaIntakeForm = lazy(() => import("@/components/AgendaIntakeForm").then(m => ({ default: m.AgendaIntakeForm })));
const AIIntelligencePanel = lazy(() => import("@/components/AIIntelligencePanel").then(m => ({ default: m.AIIntelligencePanel })));
const AdvancedIntelligencePanel = lazy(() => import("@/components/AdvancedIntelligencePanel").then(m => ({ default: m.AdvancedIntelligencePanel })));
const AIMinutesGenerator = lazy(() => import("@/components/AIMinutesGenerator").then(m => ({ default: m.AIMinutesGenerator })));
const DocumentVersionControl = lazy(() => import("@/components/DocumentVersionControl").then(m => ({ default: m.DocumentVersionControl })));
const MultiChannelDistribution = lazy(() => import("@/components/MultiChannelDistribution").then(m => ({ default: m.MultiChannelDistribution })));
const IntegrationManager = lazy(() => import("@/components/IntegrationManager").then(m => ({ default: m.IntegrationManager })));
const TranscriptionDocumentExport = lazy(() => import("@/components/TranscriptionDocumentExport").then(m => ({ default: m.TranscriptionDocumentExport })));
const MeetingSignaturesPanel = lazy(() => import("@/components/MeetingSignaturesPanel").then(m => ({ default: m.MeetingSignaturesPanel })));
const MeetingAudioPlayback = lazy(() => import("@/components/MeetingAudioPlayback").then(m => ({ default: m.MeetingAudioPlayback })));
const CreateSignatureRequestDialog = lazy(() => import("@/components/CreateSignatureRequestDialog").then(m => ({ default: m.CreateSignatureRequestDialog })));
const ShareMeetingDialog = lazy(() => import("@/components/ShareMeetingDialog").then(m => ({ default: m.ShareMeetingDialog })));
const ParticipantDashboard = lazy(() => import("@/components/ParticipantDashboard").then(m => ({ default: m.ParticipantDashboard })));
const SpeakerQueue = lazy(() => import("@/components/SpeakerQueue").then(m => ({ default: m.SpeakerQueue })));
const AutoAssignmentControls = lazy(() => import("@/components/AutoAssignmentControls").then(m => ({ default: m.AutoAssignmentControls })));
const MeetingAnalytics = lazy(() => import("@/components/MeetingAnalytics").then(m => ({ default: m.MeetingAnalytics })));
const RealTimePresence = lazy(() => import("@/components/RealTimePresence").then(m => ({ default: m.RealTimePresence })));
const AuditLogViewer = lazy(() => import("@/components/AuditLogViewer").then(m => ({ default: m.AuditLogViewer })));
const BreakoutRoomsManager = lazy(() => import("@/components/BreakoutRoomsManager").then(m => ({ default: m.BreakoutRoomsManager })));
const MeetingTemplateManager = lazy(() => import("@/components/MeetingTemplateManager").then(m => ({ default: m.MeetingTemplateManager })));
const NotificationPreferences = lazy(() => import("@/components/NotificationPreferences").then(m => ({ default: m.NotificationPreferences })));
const LivePolling = lazy(() => import("@/components/LivePolling").then(m => ({ default: m.LivePolling })));
const CollaborativeNotes = lazy(() => import("@/components/CollaborativeNotes").then(m => ({ default: m.CollaborativeNotes })));
const MeetingBookmarks = lazy(() => import("@/components/MeetingBookmarks").then(m => ({ default: m.MeetingBookmarks })));
const MeetingSummaryCard = lazy(() => import("@/components/MeetingSummaryCard").then(m => ({ default: m.MeetingSummaryCard })));
const MeetingKeyPointsSummary = lazy(() => import("@/components/MeetingKeyPointsSummary").then(m => ({ default: m.MeetingKeyPointsSummary })));
const MeetingKeywordSearch = lazy(() => import("@/components/MeetingKeywordSearch").then(m => ({ default: m.MeetingKeywordSearch })));
const EnhancedDocumentsTab = lazy(() => import("@/components/EnhancedDocumentsTab").then(m => ({ default: m.EnhancedDocumentsTab })));
const TimeBasedAccessGuard = lazy(() => import("@/components/TimeBasedAccessGuard").then(m => ({ default: m.TimeBasedAccessGuard })));
const ProtectedElement = lazy(() => import("@/components/ProtectedElement").then(m => ({ default: m.ProtectedElement })));
const HostManagementPanel = lazy(() => import("@/components/HostManagementPanel").then(m => ({ default: m.HostManagementPanel })));
const PDFGenerationPanel = lazy(() => import("@/components/PDFGenerationPanel").then(m => ({ default: m.PDFGenerationPanel })));
const SystemTestPanel = lazy(() => import("@/components/SystemTestPanel").then(m => ({ default: m.SystemTestPanel })));
const TranscriptionProviderToggle = lazy(() => import("@/components/TranscriptionProviderToggle").then(m => ({ default: m.TranscriptionProviderToggle })));
const UnifiedEmotionIntelligence = lazy(() => import("@/components/UnifiedEmotionIntelligence").then(m => ({ default: m.UnifiedEmotionIntelligence })));

// Import LazyTabContent normally - it can't be lazy-loaded since it provides Suspense boundaries
import { LazyTabContent } from "@/components/LazyTabContent";

// Import hooks normally (cannot be lazy loaded)
import { useRealtimeMeetingData } from "@/hooks/useRealtimeMeetingData";
import { useRealtimeAgenda } from "@/hooks/useRealtimeAgenda";

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
  const { user, loading: authLoading } = useAuth();
  const isEthioTelecom = theme === 'ethio-telecom';
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);
  const [showViewMinutesDialog, setShowViewMinutesDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showManageAttendeesDialog, setShowManageAttendeesDialog] = useState(false);
  const [showCreateSignatureDialog, setShowCreateSignatureDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showVirtualRoom, setShowVirtualRoom] = useState(false);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [isVirtualRoomMeeting, setIsVirtualRoomMeeting] = useState(false);
  const [agendaData, setAgendaData] = useState<AgendaItem[]>(agendaItems);
  const [attendeesData, setAttendeesData] = useState(attendees);
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
  const [showLiveModal, setShowLiveModal] = useState(false);
  
  const meetingId = id || "demo-meeting-id";
  
  // Fast initial meeting fetch (realtime) to avoid long loading state
  const { meeting: meetingRealtime, loading: meetingRealtimeLoading } = useRealtimeMeetingData(meetingId);
  
  // User info from cached auth
  const userId = user?.id || "";
  const userFullName = useMemo(() => user?.user_metadata?.full_name || "User", [user]);
  
  // Realtime data hooks
  const { agenda: realtimeAgenda } = useRealtimeAgenda(meetingId);
  const { transcriptions: realtimeTranscriptions, loading: transcriptionsLoading } = useRealtimeTranscriptions(meetingId);
  
  const meetingAccess = useMeetingAccess(id);
  const { 
    isRecording,
    isPaused, 
    startRecording, 
    stopRecording, 
    pauseRecording, 
    resumeRecording 
  } = useAudioRecorder(meetingId);

  // Auto-detect chapters from transcriptions
  useChapterDetection(meetingId, realtimeTranscriptions, isRecording);

  // Optimized meeting data fetch with caching
  const fetchMeetingData = useCallback(async () => {
    if (!id) return null;

    // Batch all queries in parallel
    const [meetingResult, attendeesResult, agendaResult] = await Promise.all([
      supabase
        .from("meetings")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("meeting_attendees")
        .select("*, profiles(full_name, email)")
        .eq("meeting_id", id),
      supabase
        .from("agenda_items")
        .select("*")
        .eq("meeting_id", id)
        .order("order_index")
    ]);

    if (meetingResult.error) throw meetingResult.error;
    if (!meetingResult.data) return null;

    const result = {
      meeting: meetingResult.data,
      attendees: attendeesResult.data || [],
      agenda: agendaResult.data || [],
    };

    // Cache for 2 minutes
    localStorageCache.set(`meeting_${id}`, result, 2 * 60 * 1000);

    return result;
  }, [id]);

  const { data: meetingData, loading, refetch } = useOptimizedQuery(
    `meeting_${id}`,
    fetchMeetingData,
    {
      enabled: !authLoading && !!user && !!id,
      cacheDuration: 2 * 60 * 1000,
    }
  );

  const meeting = meetingData?.meeting || meetingRealtime || null;

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
          refetch();
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
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);

  // Set virtual room status
  useEffect(() => {
    if (meeting) {
      setIsVirtualRoomMeeting(meeting.video_provider === 'jitsi_meet' || meeting.meeting_type === 'virtual_room');
      
      // Auto-open virtual room for virtual meetings
      if (meeting.meeting_type === 'virtual_room') {
        setShowVirtualRoom(true);
      }
      
      // Set active tab based on meeting type
      if ((meeting.meeting_type === 'video_conference' || meeting.meeting_type === 'virtual_room') && 
          (meeting.video_conference_url || meeting.meeting_type === 'virtual_room')) {
        setActiveTab('video');
      }
    }
  }, [meeting]);

  // Update agenda and attendees when data changes
  useEffect(() => {
    if (meetingData?.agenda) {
      const formattedAgenda = meetingData.agenda.map((item: any) => ({
        id: item.id,
        title: item.title,
        duration: `${item.duration_minutes || 20} min`,
        presenter: item.presenter_id || "TBD",
        status: item.status as "pending" | "in-progress" | "completed",
      }));
      setAgendaData(formattedAgenda);
    }

    if (meetingData?.attendees) {
      const formattedAttendees = meetingData.attendees.map((attendee: any) => {
        const profile = attendee.profiles;
        const name = profile?.full_name || "Unknown";
        const role = profile?.title || profile?.email || "Participant";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2);

        return { name, initials, role };
      });
      setAttendeesData(formattedAttendees);
    }
  }, [meetingData]);

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

  // Show loading only until we have the basic meeting row
  if (!meeting && (meetingRealtimeLoading || loading)) {
    return <MeetingDetailSkeleton />;
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

  if (!meeting) {
    return <MeetingDetailSkeleton />;
  }

  return (
    <TimeBasedAccessGuard meetingId={meetingId}>
      <div className="flex flex-col min-h-screen">
        {/* Live Meeting Status Bar */}
        <LiveMeetingStatusBar
          meetingTitle={meetingTitle}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          onStartRecording={() => {
            setRecordingSeconds(0);
            recordingStartTimeRef.current = null;
            pausedDurationRef.current = 0;
            pauseStartTimeRef.current = null;
            startRecording();
            setShowLiveModal(true);
          }}
          onStopRecording={() => {
            stopRecording();
            setShowLiveModal(false);
          }}
          onShare={() => setShowShareDialog(true)}
          onGenerateMinutes={() => setShowMinutesDialog(true)}
        />

        {/* AI Summary Strip */}
        <AISummaryStrip meetingId={meetingId} isRecording={isRecording} />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Primary Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6 space-y-6">
              {/* Primary Tabs - Clean & Focused */}
              <Tabs defaultValue="transcript" className="space-y-6">
                <TabsList className="inline-flex w-auto h-auto p-1 gap-2 bg-muted/50">
                  <TabsTrigger value="transcript" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Mic className="h-4 w-4" />
                    Transcript
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <ListChecks className="h-4 w-4" />
                    Agenda
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Actions
                  </TabsTrigger>
                </TabsList>

                {/* Transcript Tab */}
                <TabsContent value="transcript" className="mt-0">
                  {transcriptionsLoading ? (
                    <Card className="p-8 text-center">
                      <div className="space-y-3">
                        <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center animate-pulse">
                          <Mic className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Loading transcriptions...</p>
                      </div>
                    </Card>
                  ) : (
                    <LiveTranscriptPanel 
                      transcriptions={realtimeTranscriptions || []}
                      onAddAction={(content) => {
                        toast({ title: "Action added", description: content });
                      }}
                      onAddDecision={(content) => {
                        toast({ title: "Decision recorded", description: content });
                      }}
                    />
                  )}
                </TabsContent>

                {/* Agenda Tab */}
                <TabsContent value="agenda" className="mt-0">
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

                {/* Actions Tab (merged Decisions) */}
                <TabsContent value="actions" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Decisions & Action Items</CardTitle>
                      <CardDescription>
                        Key decisions and tasks captured during the meeting
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {decisions.map((decision) => (
                        <div key={decision.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                          <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">{decision.decision}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {decision.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right: Dock Panel */}
          <MeetingRightDock 
            meetingId={meetingId}
            participants={attendeesData}
            documents={[]}
          />
        </div>

        {/* Chapter Timeline */}
        <ChapterTimeline
          markers={[
            { id: "1", timestamp: 0, type: "speaker", label: "Meeting Start", speaker: "CEO" },
            { id: "2", timestamp: 180, type: "topic", label: "Q4 Review", speaker: "CFO" },
            { id: "3", timestamp: 420, type: "decision", label: "Budget Approved" },
            { id: "4", timestamp: 720, type: "action", label: "Hiring Plan" },
          ]}
          currentTime={recordingSeconds}
          duration={7200}
          onSeek={(time) => {
            toast({ title: "Seeking to timestamp", description: `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}` });
          }}
        />

        {/* Dialogs */}
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
          onSuccess={refetch}
        />

        <ManageAttendeesDialog
          meetingId={meetingId}
          open={showManageAttendeesDialog}
          onOpenChange={setShowManageAttendeesDialog}
          onSuccess={refetch}
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

        {/* Live Transcription Modal */}
        <LiveTranscriptionModal
          isOpen={showLiveModal}
          onClose={() => setShowLiveModal(false)}
          meetingTitle={meetingTitle}
          transcriptions={realtimeTranscriptions}
          recordingSeconds={recordingSeconds}
        />
      </div>
    </TimeBasedAccessGuard>
  );
};

export default MeetingDetail;
