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

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Accumulate final results separately to avoid duplicates
          finalTranscriptRef.current += transcriptSegment + ' ';
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      // Display accumulated final + current interim (interim gets replaced, not accumulated)
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        setError('Microphone not found. Please check your microphone.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      
      // Auto-restart if we should still be listening (browser stopped due to silence)
      if (shouldBeListening) {
        console.log('Auto-restarting speech recognition...');
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            console.error('Error restarting recognition:', err);
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, language, shouldBeListening]);

  const startListening = useCallback((lang?: string) => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (lang && recognitionRef.current) {
      recognitionRef.current.lang = lang;
      setLanguage(lang);
    }

    setShouldBeListening(true);
    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Failed to start speech recognition.');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    setShouldBeListening(false);
    try {
      recognitionRef.current?.stop();
    } catch (err) {
      console.error('Error stopping recognition:', err);
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
