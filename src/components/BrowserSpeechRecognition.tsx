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
import { transcribeAudioBrowser } from '@/utils/browserWhisper';

interface BrowserSpeechRecognitionProps {
  meetingId: string;
  externalIsRecording?: boolean;
  isPaused?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (durationSeconds?: number) => void;
  onDurationChange?: (seconds: number) => void;
}

// Internal recording state for standalone usage
const useInternalRecording = (externalIsRecording?: boolean) => {
  const [internalRecording, setInternalRecording] = useState(false);
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : internalRecording;
  return { isRecording, setInternalRecording };
};

export const BrowserSpeechRecognition = ({ 
  meetingId, 
  externalIsRecording,
  isPaused = false,
  onRecordingStart,
  onRecordingStop,
  onDurationChange
}: BrowserSpeechRecognitionProps) => {
  const { isRecording, setInternalRecording } = useInternalRecording(externalIsRecording);
  
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

  const [selectedLanguage, setSelectedLanguage] = useState('am-ET');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  const [savedAudios, setSavedAudios] = useState<Array<{ id: string; url: string; created_at: string; duration: number }>>([]);
  const { toast } = useToast();
  const onDurationChangeRef = useRef(onDurationChange);
  useEffect(() => { onDurationChangeRef.current = onDurationChange; }, [onDurationChange]);
  
  // Browser Whisper state - use PCM capture instead of blobs
  const [whisperTranscript, setWhisperTranscript] = useState('');
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const transcribingRef = useRef(false);
  const whisperMode = !isSupported || selectedLanguage === 'am-ET';
  
  // Audio recording hook for archiving (no PCM callback needed)
  const handleChunk = (_chunk: Blob) => {
    // No-op: PCM capture happens separately
  };

  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    pauseRecording: pauseAudioRecording,
    resumeRecording: resumeAudioRecording,
    clearRecording: clearAudioRecording,
    audioBlob,
    error: audioError
  } = useAudioRecording({ onChunk: handleChunk });

  // Track previous recording and pause states
  const prevRecordingRef = useRef(isRecording);
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

  // Sync with recording and pause state
  useEffect(() => {
    const sync = async () => {
      const prevRecording = prevRecordingRef.current;
      const prevPaused = prevPausedRef.current;
  
      console.log('Sync state:', { isRecording, isPaused, isListening, prevRecording, prevPaused });
  
      if (!isRecording) {
        // Recording stopped → save once on falling edge
        if (prevRecording) {
          console.log('Stopping recording and saving...');
          if (isListening) stopListening();
          // Clean up PCM capture
          try {
            processorRef.current?.disconnect();
            sourceRef.current?.disconnect();
            await audioContextRef.current?.close();
          } catch (e) {
            console.warn('Error cleaning up PCM capture:', e);
          }
          processorRef.current = null;
          sourceRef.current = null;
          audioContextRef.current = null;
          pcmChunksRef.current = [];
          
          const audioFile = await stopAudioRecording();
          const displayText = (whisperMode ? whisperTranscript : transcript).trim();
          if (displayText || audioFile) {
            await handleSave(audioFile);
            resetTranscript();
            setWhisperTranscript('');
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
          if (!isListening || !prevRecording) {
            console.log('Starting/resuming recording...', { isListening, prevRecording });
            // New session start (rising edge) → clear and start
            if (!prevRecording) {
              console.log('New recording session - clearing and starting fresh');
              resetTranscript();
              setWhisperTranscript('');
              setRecordingDuration(0);
              clearAudioRecording();
              pcmChunksRef.current = [];
              
              try {
                await startAudioRecording();
                console.log('Audio recording started');
                
                // Start PCM capture for Browser Whisper if in whisper mode
                if (whisperMode) {
                  console.log('Starting PCM capture for Browser Whisper, whisperMode:', whisperMode);
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                  audioContextRef.current = audioCtx;
                  sourceRef.current = audioCtx.createMediaStreamSource(stream);
                  processorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);
                  
                  processorRef.current.onaudioprocess = (e) => {
                    const input = e.inputBuffer.getChannelData(0);
                    pcmChunksRef.current.push(new Float32Array(input));
                    const maxChunks = 200; // ~30s at 24kHz
                    if (pcmChunksRef.current.length > maxChunks) {
                      pcmChunksRef.current.splice(0, pcmChunksRef.current.length - maxChunks);
                    }
                  };
                  
                  sourceRef.current.connect(processorRef.current);
                  processorRef.current.connect(audioCtx.destination);
                  console.log('PCM capture started for Browser Whisper, chunks will accumulate');
                }
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
      prevRecordingRef.current = isRecording;
      prevPausedRef.current = isPaused;
    };

    void sync();
  }, [isRecording, isPaused, isListening, selectedLanguage]);

  useEffect(() => {
    let interval: any;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          onDurationChangeRef.current?.(next);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  // Live Browser Whisper transcription loop using PCM data
  useEffect(() => {
    if (!isRecording || isPaused || !whisperMode) {
      console.log('Whisper loop skipped:', { isRecording, isPaused, whisperMode });
      return;
    }
    
    console.log('Starting Browser Whisper transcription loop');
    const interval = setInterval(async () => {
      const chunkCount = pcmChunksRef.current.length;
      console.log('Whisper loop tick, PCM chunks:', chunkCount, 'transcribing:', transcribingRef.current);
      
      if (transcribingRef.current || chunkCount === 0) return;
      transcribingRef.current = true;
      
      try {
        // Get last 8 seconds of PCM data
        const sampleRate = 24000;
        const windowSeconds = 8;
        const neededSamples = sampleRate * windowSeconds;
        
        let remaining = neededSamples;
        const selected: Float32Array[] = [];
        for (let i = pcmChunksRef.current.length - 1; i >= 0 && remaining > 0; i--) {
          const chunk = pcmChunksRef.current[i];
          selected.push(chunk);
          remaining -= chunk.length;
        }
        
        if (selected.length > 0) {
          const total = Math.min(neededSamples, selected.reduce((sum, c) => sum + c.length, 0));
          const segment = new Float32Array(total);
          let offset = total;
          for (let i = 0; i < selected.length; i++) {
            const chunk = selected[i];
            const write = Math.min(chunk.length, offset);
            segment.set(chunk.subarray(chunk.length - write), offset - write);
            offset -= write;
            if (offset <= 0) break;
          }
          
          console.log('Calling Browser Whisper with segment size:', segment.length);
          
          // Encode PCM segment into a small WAV and reuse the robust browserWhisper util
          const encodeWav = (pcm: Float32Array, sr: number) => {
            const bytesPerSample = 2; // 16-bit PCM
            const blockAlign = 1 * bytesPerSample;
            const buffer = new ArrayBuffer(44 + pcm.length * bytesPerSample);
            const view = new DataView(buffer);
            const writeString = (offset: number, s: string) => {
              for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
            };
            // RIFF header
            writeString(0, 'RIFF');
            view.setUint32(4, 36 + pcm.length * bytesPerSample, true);
            writeString(8, 'WAVE');
            // fmt chunk
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true); // PCM
            view.setUint16(20, 1, true); // format = 1 PCM
            view.setUint16(22, 1, true); // channels = 1
            view.setUint32(24, sr, true); // sample rate
            view.setUint32(28, sr * blockAlign, true); // byte rate
            view.setUint16(32, blockAlign, true); // block align
            view.setUint16(34, bytesPerSample * 8, true); // bits per sample
            // data chunk
            writeString(36, 'data');
            view.setUint32(40, pcm.length * bytesPerSample, true);
            // PCM samples
            let offset = 44;
            for (let i = 0; i < pcm.length; i++, offset += 2) {
              let s = Math.max(-1, Math.min(1, pcm[i]));
              s = s < 0 ? s * 0x8000 : s * 0x7fff;
              view.setInt16(offset, s, true);
            }
            return new Blob([view], { type: 'audio/wav' });
          };

          const wavBlob = encodeWav(segment, sampleRate);
          const text = await transcribeAudioBrowser(wavBlob);
          console.log('Browser Whisper result (util):', text);
          
          if (text && text.trim()) {
            setWhisperTranscript((prev) => {
              const cleaned = text.trim();
              if (prev.endsWith(cleaned)) return prev;
              const updated = prev ? `${prev} ${cleaned}` : cleaned;
              console.log('Updated whisper transcript:', updated);
              return updated;
            });
          }
        }
      } catch (e) {
        console.error('Browser Whisper transcription failed', e);
      } finally {
        transcribingRef.current = false;
      }
    }, 3000);
    return () => {
      console.log('Stopping Browser Whisper transcription loop');
      clearInterval(interval);
    };
  }, [isRecording, isPaused, whisperMode]);

  // Auto-save transcript every ~5s while recording (no audio upload, text only)
  const lastSavedLenRef = useRef(0);
  useEffect(() => {
    if (!isListening) return;
    const autosave = setInterval(async () => {
      const text = transcript.trim();
      if (text && text.length - lastSavedLenRef.current >= 10) {
        try {
          await supabase.functions.invoke('save-transcription', {
            body: {
              meetingId,
              content: text.slice(lastSavedLenRef.current),
              timestamp: new Date().toISOString(),
              speaker: userName,
              detectedLanguage: selectedLanguage,
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

  // Autosave for Browser Whisper mode
  useEffect(() => {
    if (!whisperMode || !isRecording || isPaused) return;
    const autosave = setInterval(async () => {
      const text = whisperTranscript.trim();
      if (text && text.length - lastSavedLenRef.current >= 10) {
        try {
          await supabase.functions.invoke('save-transcription', {
            body: {
              meetingId,
              content: text.slice(lastSavedLenRef.current),
              timestamp: new Date().toISOString(),
              speaker: userName,
              detectedLanguage: selectedLanguage,
            },
          });
          lastSavedLenRef.current = text.length;
        } catch (e) {
          console.warn('Autosave (whisper) failed:', e);
        }
      }
    }, 2000);
    return () => clearInterval(autosave);
  }, [whisperMode, whisperTranscript, isRecording, isPaused, meetingId, userName, selectedLanguage]);

  const handleSave = async (audioFile?: Blob | null) => {
    const displayText = (whisperMode ? whisperTranscript : transcript).trim();
    if (!displayText && !audioFile) return;
    if (isSaving) return; // Prevent duplicate saves

    setIsSaving(true);
    try {
      let finalText = displayText;

      // If we have audio but no text → prefer Web Speech API; only fall back to server if not supported
      if (audioFile && !finalText && !isSupported) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(audioFile);
          });

          // Attempt server-side transcription once; handle rate limits gracefully
          const attemptTranscription = async () => {
            return await supabase.functions.invoke('transcribe-audio', {
              body: {
                audioBase64: base64,
                meetingId,
                language: selectedLanguage || 'auto',
                contentType: audioFile.type || 'audio/webm'
              }
            });
          };

          let { data, error } = await attemptTranscription();

          if (error) {
            const msg = (error as any)?.message ? String((error as any).message) : String(error);
            // Try to extract retryAfter from error payload if present
            let retryAfter = 0;
            const m = msg.match(/"retryAfter"\s*:\s*(\d+)/);
            if (m && m[1]) retryAfter = parseInt(m[1], 10);

            if (msg.includes('429') || /rate limit/i.test(msg)) {
              // Inform user and wait once before a single retry
              const waitSec = retryAfter > 0 ? retryAfter : 10;
              toast({
                title: 'Transcription rate-limited',
                description: `Retrying in ${waitSec}s... Your audio will still be saved.`,
              });
              await new Promise((r) => setTimeout(r, waitSec * 1000));
              const retry = await attemptTranscription();
              data = retry.data;
              error = retry.error as any;
            }
          }

          if (error) {
            console.warn('Server-side transcription failed:', error);
            // Don't throw - just log and continue without transcription
            toast({
              title: 'Transcription unavailable',
              description: 'Audio saved but transcription service is temporarily unavailable. Your recording is safe.',
              variant: 'default',
            });
          } else if (data?.transcription) {
            finalText = data.transcription as string;
          }
        } catch (transcribeError) {
          console.warn('Transcription error:', transcribeError);
          // Continue without transcription - audio will still be saved
          toast({
            title: 'Transcription skipped',
            description: 'Could not transcribe audio, but your recording is saved.',
            variant: 'default',
          });
        }
      }

      // Save transcription text (either browser-recognized or server-side)
      if (finalText) {
        const { error: saveErr } = await supabase.functions.invoke('save-transcription', {
          body: {
            meetingId,
            content: finalText,
            timestamp: new Date().toISOString(),
            speaker: userName,
            detectedLanguage: selectedLanguage,
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
    setWhisperTranscript('');
    pcmChunksRef.current = [];
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
      <Card>
        <CardHeader>
          <CardTitle>Browser Speech Recognition</CardTitle>
          <CardDescription className="text-destructive">
            Your browser doesn't support speech recognition. Please use Chrome or Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Speech to Text</CardTitle>
        <CardDescription>Click the microphone to start recording</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Languages className="w-4 h-4" />
            Language
          </label>
          <Select
            value={selectedLanguage}
            onValueChange={(value) => {
              setSelectedLanguage(value);
              setLanguage(value);
            }}
            disabled={isListening}
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
        </div>

        <div className="flex flex-col items-center gap-6">
          {isRecording && !isPaused && (
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
              {!isListening && !whisperMode && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Starting speech recognition...
                </p>
              )}
            </div>
          )}

          {isRecording && isPaused && (
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

          {!isRecording && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Use the <strong>"Start Recording"</strong> button above to begin transcription
              </p>
            </div>
          )}
        </div>

        <div className="min-h-[200px] max-h-[400px] overflow-y-auto bg-muted rounded-lg p-4">
          {(whisperMode ? whisperTranscript : transcript) ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">{userName}</Badge>
                <p className="text-lg leading-relaxed flex-1">{whisperMode ? whisperTranscript : transcript}</p>
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
      </CardContent>
    </Card>
  );
};
