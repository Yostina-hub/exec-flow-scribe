import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { transcribeAudioBrowser } from '@/utils/browserWhisper';

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

export const useAudioRecorder = (meetingId: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const normalizedMeetingId = normalizeMeetingId(meetingId);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

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
            .select('provider')
            .eq('user_id', user.id)
            .maybeSingle();

          const provider = preferences?.provider || 'lovable_ai';

          try {
            // Determine provider behavior
            if (provider === 'openai_realtime' || provider === 'lovable_ai') {
              // Realtime mode (or default): handled by OpenAI Realtime via WebRTC.
              // Do not run browser/server chunk transcription to avoid conflicts and errors.
              return;
            } else if (provider === 'browser') {
              // Use only the latest chunk to ensure a valid WebM container
              const latest = chunksRef.current[chunksRef.current.length - 1];
              if (!latest || latest.size < 8192) return; // skip tiny/partial segments

              const text = await transcribeAudioBrowser(latest);
              console.log('Browser transcription:', text);
              
              if (text && text.trim()) {
                // Save via secure backend
                const { error: saveErr } = await supabase.functions.invoke('save-transcription', {
                  body: {
                    meetingId: normalizedMeetingId,
                    content: text,
                    timestamp: new Date().toISOString(),
                    speaker: 'Unknown'
                  }
                });
                if (saveErr) throw saveErr;
              }
            } else if (provider === 'openai') {
              // Use server-side transcription (OpenAI Whisper)
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                
                try {
                  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                    body: { audioBase64: base64Audio, meetingId: normalizedMeetingId }
                  });

                  if (error) throw error;
                  
                  console.log('Transcription:', data);
                } catch (err: any) {
                  console.error('Transcription error:', err);
                  toast({
                    title: 'Transcription failed',
                    description: 'Please ensure your transcription provider is configured correctly. ' + (err?.message || ''),
                    variant: 'destructive',
                  });
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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(5000); // Record in 5-second chunks
      setIsRecording(true);
      
      toast({
        title: 'Recording started',
        description: 'Live transcription is now active',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording failed',
        description: 'Could not access microphone',
        variant: 'destructive',
      });
    }
  }, [normalizedMeetingId, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      toast({
        title: 'Recording stopped',
        description: 'Transcription complete',
      });
    }
  }, [isRecording, toast]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isRecording, isPaused]);

  return {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
};
