import { useState, useRef, useCallback } from 'react';

export interface AudioRecordingHook {
  isRecording: boolean;
  isPaused: boolean;
  audioBlob: Blob | null;
  audioDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  error: string | null;
}

export const useAudioRecording = (): AudioRecordingHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access with 24kHz sample rate
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Determine best audio format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/ogg;codecs=opus';
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        // Calculate actual duration
        const duration = Math.floor((Date.now() - startTimeRef.current - pauseTimeRef.current) / 1000);
        setAudioDuration(duration);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        setIsRecording(false);
        setIsPaused(false);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
      };

      startTimeRef.current = Date.now();
      pauseTimeRef.current = 0;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to access microphone');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        console.log('No media recorder to stop');
        resolve(null);
        return;
      }

      const recorder = mediaRecorderRef.current;
      
      // If already inactive, just resolve
      if (recorder.state === 'inactive') {
        console.log('Recorder already inactive');
        setIsRecording(false);
        setIsPaused(false);
        resolve(null);
        return;
      }

      // Set up the stop handler
      recorder.onstop = () => {
        console.log('MediaRecorder stopped successfully');
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        const duration = Math.floor((Date.now() - startTimeRef.current - pauseTimeRef.current) / 1000);
        setAudioDuration(duration);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind);
          });
          streamRef.current = null;
        }
        
        setIsRecording(false);
        setIsPaused(false);
        resolve(blob);
      };

      // Stop the recorder
      try {
        recorder.stop();
        console.log('Stop command sent to recorder');
      } catch (err) {
        console.error('Error stopping recorder:', err);
        setIsRecording(false);
        setIsPaused(false);
        resolve(null);
      }
    });
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      pauseTimeRef.current = Date.now();
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      const pauseDuration = Date.now() - pauseTimeRef.current;
      pauseTimeRef.current = pauseDuration;
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setAudioBlob(null);
    setAudioDuration(0);
    setError(null);
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
  }, []);

  return {
    isRecording,
    isPaused,
    audioBlob,
    audioDuration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error,
  };
};