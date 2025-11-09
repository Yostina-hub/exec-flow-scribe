import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Clock, Languages, Volume2 } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BrowserSpeechRecognitionProps {
  meetingId: string;
  externalIsRecording?: boolean;
  isPaused?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (durationSeconds?: number) => void;
  onDurationChange?: (seconds: number) => void;
  selectedLanguage?: string;
}

export const BrowserSpeechRecognition = ({ 
  meetingId,
  externalIsRecording = false,
  isPaused = false,
  onRecordingStart,
  onRecordingStop,
  onDurationChange,
  selectedLanguage: externalLanguage = 'am-ET'
}: BrowserSpeechRecognitionProps) => {
  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
    setLanguage,
  } = useSpeechRecognition();

  const [selectedLanguage, setSelectedLanguage] = useState(externalLanguage);
  
  // Load language from backend on mount (default to Amharic)
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('transcription_preferences')
          .select('language')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const preferredLang = data?.language || 'am-ET'; // Default to Amharic
        console.log('🌍 BrowserSpeech loaded language:', preferredLang);
        setSelectedLanguage(preferredLang);
        setLanguage(preferredLang);
      } catch (err) {
        console.error('Failed to load language:', err);
      }
    };
    loadLanguage();
  }, [setLanguage]);
  
  // Sync with external language prop
  useEffect(() => {
    if (externalLanguage !== selectedLanguage) {
      setSelectedLanguage(externalLanguage);
      setLanguage(externalLanguage);
    }
  }, [externalLanguage, selectedLanguage, setLanguage]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
          // Load persisted state on mount
          useEffect(() => {
            const savedState = localStorage.getItem(`transcription-${meetingId}`);
            if (savedState) {
              try {
                const state = JSON.parse(savedState);
                if (state.transcript) {
                  console.log('Found saved transcript:', state.transcript.substring(0, 100));
                }
              } catch (e) {
                console.error('Failed to load transcription state:', e);
              }
            }
          }, [meetingId]);
  
  // Persist transcript to localStorage
  useEffect(() => {
    if (transcript) {
      const state = { transcript, timestamp: Date.now() };
      localStorage.setItem(`transcription-${meetingId}`, JSON.stringify(state));
    }
  }, [transcript, meetingId]);
  const [isSaving, setIsSaving] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  const [savedAudios, setSavedAudios] = useState<Array<{ id: string; url: string; created_at: string; duration: number }>>([]);
  const { toast } = useToast();
  
  // Audio recording hook for archiving
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording: pauseAudioRecording,
    resumeRecording: resumeAudioRecording,
    clearRecording: clearAudioRecording,
    audioBlob,
    error: audioError
  } = useAudioRecording();

  // Track previous external recording and pause states
  const prevExternalRef = useRef(externalIsRecording);
  const prevPausedRef = useRef(isPaused);

  // Get current user info and fetch saved audios
  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          setUserName(profile.full_name);
        }
      }
    };
    getUserInfo();
    
    // Fetch saved audio recordings
    fetchSavedAudios();
  }, [meetingId]);

  const fetchSavedAudios = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_media')
        .select('id, file_url, uploaded_at, duration_seconds')
        .eq('meeting_id', meetingId)
        .eq('media_type', 'audio')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const audiosWithUrls = data.map(audio => {
          const { data: { publicUrl } } = supabase.storage
            .from('meeting-audio')
            .getPublicUrl(audio.file_url);
          
          return {
            id: audio.id,
            url: publicUrl,
            created_at: audio.uploaded_at,
            duration: audio.duration_seconds || 0
          };
        });
        setSavedAudios(audiosWithUrls);
      }
    } catch (err) {
      console.error('Error fetching saved audios:', err);
    }
  };

  // Sync with external recording and pause state
  useEffect(() => {
    const sync = async () => {
      const prevExternal = prevExternalRef.current;
      const prevPaused = prevPausedRef.current;
  
      console.log('Sync state:', { externalIsRecording, isPaused, isListening, prevExternal, prevPaused });
  
      if (!externalIsRecording) {
        // Recording stopped → save once on falling edge
        if (prevExternal) {
          console.log('Stopping recording and saving...');
          if (isListening) stopListening();
          const audioFile = await stopAudioRecording();
          if (transcript.trim() || audioFile) {
            await handleSave(audioFile);
            resetTranscript();
          }
        }
      } else {
        // Recording is active
        if (isPaused) {
          // Pause listening and audio without clearing
          console.log('Pausing recording...');
          if (isListening) {
            stopListening();
            pauseAudioRecording();
          }
        } else {
          // Active and not paused → ensure listening
          if (!isListening || !prevExternal) {
            console.log('Starting/resuming recording...', { isListening, prevExternal });
            // New session start (rising edge) → clear and start
            if (!prevExternal) {
              console.log('New recording session - clearing and starting fresh');
              resetTranscript();
              setRecordingDuration(0);
              clearAudioRecording();
              try {
                await startAudioRecording();
                console.log('Audio recording started');
              } catch (err) {
                console.error('Failed to start audio recording:', err);
                toast({
                  title: 'Microphone Error',
                  description: 'Failed to access microphone. Please check permissions.',
                  variant: 'destructive',
                });
              }
            } else {
              // Resuming from pause
              console.log('Resuming from pause');
              resumeAudioRecording();
            }
            
            // Always try to start listening when recording is active and not paused
            console.log('Starting speech recognition with language:', selectedLanguage);
            startListening(selectedLanguage);
          }
        }
      }
  
      // Update previous flags
      prevExternalRef.current = externalIsRecording;
      prevPausedRef.current = isPaused;
    };

    void sync();
  }, [externalIsRecording, isPaused, isListening, selectedLanguage]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (externalIsRecording && !isPaused) {
      // Start or resume recording
      if (recordingStartTimeRef.current === null) {
        // Fresh start
        recordingStartTimeRef.current = Date.now();
        pausedDurationRef.current = 0;
      } else if (pauseStartTimeRef.current !== null) {
        // Resuming from pause
        const pauseDuration = Date.now() - pauseStartTimeRef.current;
        pausedDurationRef.current += pauseDuration;
        pauseStartTimeRef.current = null;
      }
      
      // Update timer every 100ms
      const updateTimer = () => {
        if (recordingStartTimeRef.current !== null) {
          const elapsed = Date.now() - recordingStartTimeRef.current - pausedDurationRef.current;
          const seconds = Math.floor(elapsed / 1000);
          setRecordingDuration(seconds);
          onDurationChange?.(seconds);
        }
      };
      
      updateTimer(); // Initial update
      interval = setInterval(updateTimer, 100);
    } else if (externalIsRecording && isPaused) {
      // Mark pause start time
      if (pauseStartTimeRef.current === null) {
        pauseStartTimeRef.current = Date.now();
      }
    } else if (!externalIsRecording) {
      // Reset when recording stops
      recordingStartTimeRef.current = null;
      pausedDurationRef.current = 0;
      pauseStartTimeRef.current = null;
      setRecordingDuration(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [externalIsRecording, isPaused, onDurationChange]);

  // Auto-save transcript every ~5s while recording (no audio upload, text only)
  const lastSavedLenRef = useRef(0);
  useEffect(() => {
    if (!isListening) return;
    const autosave = setInterval(async () => {
      const text = transcript.trim();
      if (text && text.length - lastSavedLenRef.current >= 10) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const speakerName = user?.user_metadata?.full_name || userName;

          await supabase.functions.invoke('save-transcription', {
            body: {
              meetingId,
              content: text.slice(lastSavedLenRef.current),
              timestamp: new Date().toISOString(),
              speaker: speakerName,
              detectedLanguage: selectedLanguage, // Use current language setting
            },
          });
          lastSavedLenRef.current = text.length;
        } catch (e) {
          console.warn('Autosave transcription failed:', e);
        }
      }
    }, 2000);
    return () => clearInterval(autosave);
  }, [isListening, transcript, meetingId, userName, selectedLanguage]);


  const handleSave = async (audioFile?: Blob | null) => {
    if (!transcript.trim() && !audioFile) return;
    if (isSaving) return; // Prevent duplicate saves

    setIsSaving(true);
    try {
      let finalText = transcript.trim();

      // If we have audio but no text → server-side transcription fallback
      if (audioFile && !finalText) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(audioFile);
        });

        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: {
            audioBase64: base64,
            meetingId,
            language: selectedLanguage || 'auto',
            contentType: audioFile.type || 'audio/webm'
          }
        });

        if (error) throw error;
        if (data?.transcription) {
          finalText = data.transcription as string;
        }
      }

      // Save transcription text (either browser-recognized or server-side)
      if (finalText) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const speakerName = currentUser?.user_metadata?.full_name || userName;

        const { error: saveErr } = await supabase.functions.invoke('save-transcription', {
          body: {
            meetingId,
            content: finalText,
            timestamp: new Date().toISOString(),
            speaker: speakerName,
            detectedLanguage: selectedLanguage, // Use current language setting
          },
        });
        if (saveErr) throw saveErr;
        lastSavedLenRef.current = finalText.length;
      }

      // Upload audio file to storage
      if (audioFile && userId) {
        const timestamp = Date.now();
        const fileName = `${userId}/${meetingId}/${timestamp}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('meeting-audio')
          .upload(fileName, audioFile, {
            contentType: audioFile.type,
            cacheControl: '3600',
          });
        if (uploadError) {
          console.error('Audio upload error:', uploadError);
          toast({
            title: 'Audio upload failed',
            description: uploadError.message || 'Failed to save audio file',
            variant: 'destructive',
          });
        } else {
          // Save audio reference in meeting_media table
          const { error: mediaError } = await supabase
            .from('meeting_media')
            .insert({
              meeting_id: meetingId,
              media_type: 'audio',
              file_url: fileName,
              format: audioFile.type.split('/')[1] || 'webm',
              file_size: audioFile.size,
              duration_seconds: recordingDuration,
              uploaded_by: userId,
              checksum: `audio-${timestamp}`,
            });
          if (mediaError) {
            console.error('Media reference error:', mediaError);
            toast({
              title: 'Media reference failed',
              description: mediaError.message || 'Failed to save media reference',
              variant: 'destructive',
            });
          }
        }
      }

      toast({
        title: 'Saved successfully',
        description: audioFile ? 'Transcription and audio saved' : 'Transcription saved',
      });

    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    resetTranscript();
    setRecordingDuration(0);
    clearAudioRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="p-6 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-destructive">
          Your browser doesn't support speech recognition. Please use Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6">
          {externalIsRecording && !isPaused && (
            <div className="flex flex-col items-center gap-2">
              <Badge variant="destructive" className="gap-2 text-base px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Recording
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span className="text-3xl font-mono font-bold">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
              {!isListening && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Starting speech recognition...
                </p>
              )}
            </div>
          )}

          {externalIsRecording && isPaused && (
            <div className="flex flex-col items-center gap-2">
              <Badge variant="warning" className="gap-2 text-base px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-white" />
                Paused
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span className="text-3xl font-mono font-bold">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            </div>
          )}

          {!externalIsRecording && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Use the <strong>"Start Recording"</strong> button above to begin transcription
              </p>
            </div>
          )}
        </div>

        <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-muted rounded-lg p-4">
          {transcript ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">{userName}</Badge>
                <p className="text-lg leading-relaxed flex-1">{transcript}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center italic">
              Your transcription will appear here...
            </p>
          )}
        </div>

        {(error || audioError) && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error || audioError}</p>
          </div>
        )}

        {savedAudios.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Recorded Audio ({savedAudios.length})</h3>
            </div>
            {savedAudios.map((audio) => (
              <div key={audio.id} className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Duration: {formatDuration(audio.duration)}</span>
                  <span>{new Date(audio.created_at).toLocaleString()}</span>
                </div>
                <audio 
                  controls 
                  className="w-full h-10"
                  src={audio.url}
                  preload="metadata"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            ))}
          </div>
        )}

        {transcript && !isListening && (
          <Button
            onClick={handleClear}
            variant="outline"
            className="w-full gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear & Start New
          </Button>
        )}
    </div>
  );
};
