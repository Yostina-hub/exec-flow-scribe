import { useState, useEffect, useRef, useCallback } from 'react';

// Extend Window interface for WebKit speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: (language?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
  setLanguage: (language: string) => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('am-ET');
  const [shouldBeListening, setShouldBeListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const shouldBeListeningRef = useRef(false);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const lastStartAtRef = useRef<number>(0);

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5; // Increased for better accuracy
    recognition.lang = language;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      isListeningRef.current = true;
      isStartingRef.current = false;
      lastStartAtRef.current = Date.now();
      setError(null);
      // Keep-alive: Chrome auto-stops after ~60s; force restart via onend
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      keepAliveIntervalRef.current = window.setInterval(() => {
        if (shouldBeListeningRef.current) {
          try {
            recognition.stop(); // onend will trigger; external controller will restart
          } catch {}
        }
      }, 55000);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let confidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptSegment = result[0].transcript;
        confidence = result[0].confidence || 0;

        if (result.isFinal) {
          // Add proper spacing and capitalize first letter
          const trimmedSegment = transcriptSegment.trim();
          if (trimmedSegment) {
            // Add period if confidence is high and segment doesn't end with punctuation
            const needsPunctuation = confidence > 0.8 && !/[.!?]$/.test(trimmedSegment);
            const formattedSegment = trimmedSegment.charAt(0).toUpperCase() + trimmedSegment.slice(1);
            finalTranscriptRef.current += formattedSegment + (needsPunctuation ? '. ' : ' ');
          }
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      // Display accumulated final + current interim (interim gets replaced, not accumulated)
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let msg: string | null = null;
      if (event.error === 'no-speech') {
        msg = 'No speech detected. Trying again...';
      } else if (event.error === 'audio-capture') {
        msg = 'Microphone not found. Please check your microphone.';
      } else if (event.error === 'not-allowed') {
        msg = 'Microphone permission denied. Please allow microphone access.';
      } else if (event.error === 'network') {
        msg = 'Network issue. Trying to reconnect...';
      }
      if (msg) setError(msg);
      // Auto-recover on common transient errors with debounce
      const recoverable = ['no-speech', 'network', 'aborted'].includes(event.error);
      if (recoverable && shouldBeListeningRef.current) {
        try { recognitionRef.current?.stop(); } catch {}
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        restartTimerRef.current = window.setTimeout(() => {
          if (shouldBeListeningRef.current && !isListeningRef.current && !isStartingRef.current) {
            try {
              isStartingRef.current = true;
              recognitionRef.current?.start();
            } catch (err) {
              console.error('Error restarting after error:', err);
              isStartingRef.current = false;
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      isListeningRef.current = false;
      // Auto-restart if we should still be listening (e.g., long Chrome sessions or brief silence)
      if (shouldBeListeningRef.current) {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        const since = Date.now() - lastStartAtRef.current;
        const delay = Math.max(800, 1200 - since);
        restartTimerRef.current = window.setTimeout(() => {
          if (shouldBeListeningRef.current && !isListeningRef.current && !isStartingRef.current) {
            try {
              isStartingRef.current = true;
              recognitionRef.current?.start();
            } catch (err) {
              console.error('Error auto-restarting recognition:', err);
              isStartingRef.current = false;
            }
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [isSupported, language]);

  const startListening = useCallback((lang?: string) => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (lang && recognitionRef.current) {
      recognitionRef.current.lang = lang;
      setLanguage(lang);
    }

    if (isListeningRef.current) {
      console.log('Recognition already active, skipping start');
      return;
    }
    if (isStartingRef.current) {
      console.log('Recognition is starting, skipping duplicate start');
      return;
    }

    const now = Date.now();
    const elapsed = now - lastStartAtRef.current;
    const delay = elapsed < 800 ? 800 - elapsed : 0;

    console.log('startListening called with language:', lang || language, 'delay', delay);
    setShouldBeListening(true);
    shouldBeListeningRef.current = true;

    const doStart = () => {
      try {
        if (recognitionRef.current) {
          console.log('Starting speech recognition...');
          isStartingRef.current = true;
          recognitionRef.current.start();
        } else {
          console.error('Recognition ref is null');
          setError('Speech recognition not initialized');
        }
      } catch (err: any) {
        console.error('Error starting recognition:', err);
        isStartingRef.current = false;
        // If already started, ignore the error
        if (err.message?.includes('already started')) {
          console.log('Recognition already started, continuing...');
        } else {
          setError(`Failed to start speech recognition: ${err.message || 'Unknown error'}`);
        }
      }
    };

    if (delay > 0) {
      window.setTimeout(doStart, delay);
    } else {
      doStart();
    }
  }, [isSupported, language]);

  const stopListening = useCallback(() => {
    setShouldBeListening(false);
    shouldBeListeningRef.current = false;
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch (err) {
      console.error('Error stopping recognition:', err);
    } finally {
      isListeningRef.current = false;
      isStartingRef.current = false;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    setError(null);
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error,
    setLanguage: (lang: string) => {
      setLanguage(lang);
      if (recognitionRef.current) {
        recognitionRef.current.lang = lang;
      }
    },
  };
};
