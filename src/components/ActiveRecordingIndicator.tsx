import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ActiveRecordingIndicator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeRecording, setActiveRecording] = useState<{
    meetingId: string;
    meetingTitle: string;
    startTime: number;
    isHost: boolean;
  } | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  useEffect(() => {
    checkActiveRecording();

    // Listen to storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('meeting-recording-')) {
        checkActiveRecording();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Check every second for updates
    const interval = setInterval(() => {
      checkActiveRecording();
      updateDuration();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [location.pathname]);

  const checkActiveRecording = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check localStorage for any active recordings
      const keys = Object.keys(localStorage);
      const recordingKeys = keys.filter(key => key.startsWith('meeting-recording-'));

      for (const key of recordingKeys) {
        const data = localStorage.getItem(key);
        if (!data) continue;

        const recordingData = JSON.parse(data);
        if (!recordingData.isRecording) continue;

        const meetingId = key.replace('meeting-recording-', '');

        // Don't show if we're already on this meeting's page
        if (location.pathname.includes(meetingId)) {
          setActiveRecording(null);
          return;
        }

        // Fetch meeting details to check if user is host
        const { data: meeting } = await supabase
          .from('meetings')
          .select('title, created_by')
          .eq('id', meetingId)
          .single();

        if (meeting && meeting.created_by === user.id) {
          setActiveRecording({
            meetingId,
            meetingTitle: meeting.title,
            startTime: recordingData.startTime,
            isHost: true,
          });
          return;
        }
      }

      setActiveRecording(null);
    } catch (error) {
      console.error('Error checking active recording:', error);
    }
  };

  const updateDuration = () => {
    if (!activeRecording) return;

    const data = localStorage.getItem(`meeting-recording-${activeRecording.meetingId}`);
    if (!data) return;

    const recordingData = JSON.parse(data);
    if (!recordingData.isRecording || !recordingData.startTime) return;

    const elapsed = Date.now() - recordingData.startTime;
    const pausedDuration = recordingData.pausedDuration || 0;
    const duration = Math.floor((elapsed - pausedDuration) / 1000);
    setRecordingDuration(duration);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReturnToMeeting = () => {
    navigate(`/meetings/${activeRecording!.meetingId}`);
  };

  const handleDismiss = () => {
    setActiveRecording(null);
  };

  if (!activeRecording) return null;

  return (
    <Card className="fixed bottom-6 right-6 z-50 shadow-lg border-2 border-primary/20 animate-slide-in-up">
      <div className="flex items-center gap-4 p-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping bg-destructive/30 rounded-full" />
          <div className="relative flex items-center justify-center h-10 w-10 bg-destructive rounded-full">
            <Mic className="h-5 w-5 text-destructive-foreground" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Recording in Progress</p>
          <p className="text-xs text-muted-foreground truncate">{activeRecording.meetingTitle}</p>
          <p className="text-xs font-mono text-primary mt-1">{formatDuration(recordingDuration)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleReturnToMeeting}
            className="font-semibold"
          >
            Return
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
