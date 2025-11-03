import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { initBrowserWhisper } from '@/utils/browserWhisper';

// Normalize meeting IDs deterministically so client/server match without localStorage
const stringToUUID = (input: string) => {
  const s = String(input);
  let h1 = 0xdeadbeef >>> 0, h2 = 0x41c6ce57 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761) >>> 0;
    h2 = Math.imul(h2 ^ ch, 1597334677) >>> 0;
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  const bytes = new Uint8Array(16);
  const v = new DataView(bytes.buffer);
  v.setUint32(0, h1);
  v.setUint32(4, h2);
  v.setUint32(8, h1 ^ h2);
  v.setUint32(12, (h1 >>> 1) ^ (h2 << 1));
  // RFC 4122 variant & version
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

const normalizeMeetingId = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : stringToUUID(id);
};

// Choose a recording mime type that this browser supports (Safari prefers MP4/AAC)
const pickSupportedMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const t of candidates) {
    try {
      if ((window as any).MediaRecorder && (MediaRecorder as any).isTypeSupported?.(t)) {
        return t;
      }
    } catch {}
  }
  return undefined;
};

export const useAudioRecorder = (meetingId: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const normalizedMeetingId = normalizeMeetingId(meetingId);

  const startRecording = useCallback(async () => {
    try {
      // Update meeting status to "in_progress" when recording starts
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(meetingId)) {
        await supabase
          .from('meetings')
          .update({ 
            status: 'in_progress',
            actual_start_time: new Date().toISOString()
          })
          .eq('id', meetingId);
      }

      // Preflight checks to avoid common NotFoundError causes
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: 'Microphone unsupported',
          description: 'Your browser does not support audio recording APIs.',
          variant: 'destructive',
        });
        return;
      }

      // Check for available input devices (may return empty before permission)
      let audioInputs: MediaDeviceInfo[] = [];
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        audioInputs = devices.filter((d) => d.kind === 'audioinput');
        console.info('Mic diagnostics:', {
          secure: window.isSecureContext,
          inIframe: window.top !== window,
          audioInputs: audioInputs.map(d => ({ label: d.label || '(no label)', deviceId: d.deviceId.slice(0, 6) + '…' })),
        });
      } catch (e) {
        console.warn('enumerateDevices failed (may require permission first):', e);
      }

      const preferredDeviceId = audioInputs[0]?.deviceId;

      // Optional Permissions API probe (not supported everywhere)
      let permissionState: PermissionState | null = null;
      try {
        const perm: any = await (navigator as any).permissions?.query({ name: 'microphone' as any });
        permissionState = perm?.state ?? null;
      } catch {}

      // Try multiple constraint sets to avoid NotFoundError/OverconstrainedError
      let acquired: MediaStream | null = null;
      let lastError: any = null;
      const candidates: MediaStreamConstraints[] = [
        {
          audio: {
            deviceId: preferredDeviceId ? { ideal: preferredDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          } as MediaTrackConstraints,
        },
        { audio: true },
        { audio: { deviceId: 'default' as any } as any },
      ];

      for (const c of candidates) {
        try {
          acquired = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch (e) {
          lastError = e;
        }
      }

      if (!acquired) {
        let description = 'Could not access microphone.';
        if (lastError instanceof DOMException) {
          switch (lastError.name) {
            case 'NotAllowedError':
              description = 'Microphone permission denied. Allow access in browser site settings.';
              // Extra hint for embedded previews
              if (window.top !== window) {
                description += ' Tip: open the preview in a new tab — some browsers block mic in embedded iframes.';
              }
              break;
            case 'NotFoundError':
              description = audioInputs.length === 0
                ? 'No microphone detected. Check OS privacy settings and browser site permissions.'
                : 'Requested input not available. Try selecting a different microphone in system settings.';
              break;
            case 'OverconstrainedError':
              description = 'No microphone met the requested constraints.';
              break;
            default:
              description = (lastError as any).message || description;
          }
        }
        toast({ title: 'Recording failed', description, variant: 'destructive' });
        return;
      }

      const stream = acquired;

      const supported = pickSupportedMimeType();
      const options: MediaRecorderOptions | undefined = supported ? { mimeType: supported } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options as any);
      
      // Prevent recording from stopping when tab is hidden
      mediaRecorder.addEventListener('pause', (e) => {
        console.log('MediaRecorder pause event - keeping recording active');
        if (mediaRecorderRef.current?.state === 'paused' && isRecording) {
          mediaRecorderRef.current.resume();
        }
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Set up PCM capture via WebAudio for Browser Whisper (avoids container decode issues)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }) as AudioContext;
        audioContextRef.current = audioCtx;
        sourceRef.current = audioCtx.createMediaStreamSource(stream);
        processorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);
        pcmChunksRef.current = [];

        processorRef.current.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          // Copy buffer to avoid referencing the same underlying memory
          pcmChunksRef.current.push(new Float32Array(input));
          // Keep roughly last 30s of audio (~4096 samples per chunk at 24kHz ≈ 170ms → ~176 chunks)
          const maxPcmChunks = 200;
          if (pcmChunksRef.current.length > maxPcmChunks) {
            pcmChunksRef.current.splice(0, pcmChunksRef.current.length - maxPcmChunks);
          }
        };

        sourceRef.current.connect(processorRef.current);
        processorRef.current.connect(audioCtx.destination);
      } catch (e) {
        console.warn('Failed to initialize PCM capture for Browser Whisper', e);
      }

      // Send audio chunks every 5 seconds for transcription
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Keep only the most recent ~30s of audio to limit memory
          const maxChunks = 6; // 6 * 5s = 30s
          if (chunksRef.current.length > maxChunks) {
            chunksRef.current.splice(0, chunksRef.current.length - maxChunks);
          }
          
          // Check transcription provider preference
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: preferences } = await supabase
            .from('transcription_preferences')
            .select('provider, language')
            .eq('user_id', user.id)
            .maybeSingle();

          const provider = preferences?.provider || 'lovable_ai';
          const language = preferences?.language || 'auto';

          try {
            // Determine provider behavior
            if (provider === 'openai_realtime' || provider === 'lovable_ai') {
              // Realtime mode (or default): handled by OpenAI Realtime via WebRTC.
              // Do not run browser/server chunk transcription to avoid conflicts and errors.
              return;
            } else if (provider === 'browser') {
              // Use PCM ring buffer captured via WebAudio; avoid container decoding
              const sampleRate = 24000;
              const windowSeconds = 8;
              const neededSamples = sampleRate * windowSeconds;

              // Gather last neededSamples from pcmChunksRef
              let remaining = neededSamples;
              const selected: Float32Array[] = [];
              for (let i = pcmChunksRef.current.length - 1; i >= 0 && remaining > 0; i--) {
                const chunk = pcmChunksRef.current[i];
                selected.push(chunk);
                remaining -= chunk.length;
              }
              if (selected.length === 0) return;

              // Concatenate in correct order
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

              // Simple cleaner
              const clean = (text: string) => {
                if (!text) return '';
                let t = text
                  .replace(/\[MUSIC\]/gi, '')
                  .replace(/\[music\]/gi, '')
                  .replace(/\(breathing heavily\)/gi, '')
                  .replace(/\(breathing\)/gi, '')
                  .replace(/\[NOISE\]/gi, '')
                  .replace(/\[noise\]/gi, '')
                  .replace(/\[SOUND\]/gi, '')
                  .replace(/\[sound\]/gi, '')
                  .replace(/\[APPLAUSE\]/gi, '')
                  .replace(/\[applause\]/gi, '')
                  .replace(/\[LAUGHTER\]/gi, '')
                  .replace(/\[laughter\]/gi, '')
                  .replace(/\(coughing\)/gi, '')
                  .replace(/\(sighs\)/gi, '')
                  .replace(/\(clears throat\)/gi, '')
                  .trim();
                if (!t) return '';
                t = t.charAt(0).toUpperCase() + t.slice(1);
                if (t.length > 3 && !/[.!?]$/.test(t)) t += '.';
                return t;
              };

              const model = await initBrowserWhisper();
              const result = await model(segment);
              const rawText = (result?.text as string) || '';
              const text = clean(rawText);
              console.log('Browser transcription (PCM):', text);

              if (text && text.trim()) {
                const { error: saveErr } = await supabase.functions.invoke('save-transcription', {
                  body: {
                    meetingId: normalizedMeetingId,
                    content: text,
                    timestamp: new Date().toISOString(),
                    speaker: 'Unknown',
                    detectedLanguage: language || 'auto'
                  }
                });
                if (saveErr) throw saveErr;
              }
            } else if (provider === 'openai') {
              // Use server-side transcription (OpenAI Whisper)
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                
                // Determine content type from the recorded blob
                const contentType = event.data.type || 'audio/webm';
                
                console.log('Sending audio for transcription:', {
                  language,
                  contentType,
                  size: event.data.size,
                  meetingId: normalizedMeetingId
                });
                
                // Retry logic with exponential backoff
                const maxRetries = 3;
                let retryCount = 0;
                let transcriptionSuccess = false;
                
                while (retryCount <= maxRetries && !transcriptionSuccess) {
                  try {
                    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                      body: { 
                        audioBase64: base64Audio, 
                        meetingId: normalizedMeetingId,
                        language: language || 'auto',
                        contentType
                      }
                    });

                    if (error) {
                      // Check if it's a rate limit error
                      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s
                          console.log(`Rate limited, retrying in ${backoffDelay}ms (attempt ${retryCount}/${maxRetries})`);
                          await new Promise(resolve => setTimeout(resolve, backoffDelay));
                          continue;
                        }
                      }
                      throw error;
                    }

                    if (data?.success) {
                      console.log('Transcription result:', data.transcription.substring(0, 50));
                      transcriptionSuccess = true;
                    }
                    break;
                  } catch (err) {
                    console.error('Transcription error:', err);
                    if (retryCount >= maxRetries) {
                      throw err;
                    }
                  }
                }
                
                if (!transcriptionSuccess) {
                  console.warn('Transcription failed after retries, continuing recording');
                }
              };
              reader.readAsDataURL(event.data);
            }
          } catch (err: any) {
            console.warn('Browser transcription skipped/error:', err);
            // Avoid spamming toasts for transient browser decode issues
          }
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped - cleaning up all resources');
        try {
          // Stop all tracks to clear the recording indicator
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind);
          });
        } catch (e) {
          console.error('Error stopping tracks:', e);
        }
        try {
          processorRef.current?.disconnect();
          sourceRef.current?.disconnect();
          audioContextRef.current?.close();
        } catch (e) {
          console.error('Error cleaning up audio context:', e);
        }
        processorRef.current = null;
        sourceRef.current = null;
        audioContextRef.current = null;
        pcmChunksRef.current = [];
        mediaRecorderRef.current = null;
        chunksRef.current = [];
      };

      mediaRecorder.start(5000); // Record in 5-second chunks
      setIsRecording(true);
      
      toast({
        title: 'Recording started',
        description: 'Live transcription is now active',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Could not access microphone';
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotFoundError':
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
            break;
          case 'NotAllowedError':
            errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
            break;
          case 'NotReadableError':
            errorMessage = 'Microphone is already in use by another application.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'No microphone found that meets the requirements.';
            break;
          case 'AbortError':
            errorMessage = 'Microphone access was aborted.';
            break;
          default:
            errorMessage = `Microphone error: ${error.message}`;
        }
      }
      
      toast({
        title: 'Recording failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [normalizedMeetingId, toast]);

  const stopRecording = useCallback(async () => {
    console.log('Stop recording called');
    
    if (!mediaRecorderRef.current) {
      console.log('No media recorder to stop');
      return;
    }

    const recorder = mediaRecorderRef.current;
    
    try {
      // Stop the recorder if it's active
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        recorder.stop();
        console.log('Stop command sent to recorder, state was:', recorder.state);
      } else {
        console.log('Recorder already inactive');
      }
      
      setIsRecording(false);
      setIsPaused(false);
      
      // Update meeting status to "completed" when recording stops
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(meetingId)) {
        await supabase
          .from('meetings')
          .update({ 
            status: 'completed',
            actual_end_time: new Date().toISOString()
          })
          .eq('id', meetingId);
      }
      
      toast({
        title: 'Recording stopped',
        description: 'Meeting completed, generating minutes...',
      });
    } catch (e) {
      console.error('Error stopping recording:', e);
      // Force state update even if stop fails
      setIsRecording(false);
      setIsPaused(false);
    }
  }, [meetingId, toast]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      } catch (err) {
        console.error('Error pausing recording:', err);
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } catch (err) {
        console.error('Error resuming recording:', err);
      }
    }
  }, []);

  return {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
};
