import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Command, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_COMMANDS, matchCommand, type VoiceCommand } from '@/utils/voiceCommands';

interface VoiceCommandControllerProps {
  meetingId: string;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAddAction: () => void;
  onAddDecision: () => void;
  onEndMeeting?: () => void;
  onGenerateMinutes?: () => void;
}

export const VoiceCommandController = ({
  meetingId,
  isRecording,
  onStartRecording,
  onStopRecording,
  onAddAction,
  onAddDecision,
  onEndMeeting,
  onGenerateMinutes,
}: VoiceCommandControllerProps) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const commands = ALL_COMMANDS;

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: 'Not Supported',
        description: 'Voice commands are not supported in this browser',
        variant: 'destructive',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Primary language, but it can pick up others

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      
      // Check if transcript matches any command using the utility function
      const matchedCommand = matchCommand(transcript);

      if (matchedCommand && event.results[last].isFinal) {
        handleCommand(matchedCommand.action, matchedCommand.description);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        toast({
          title: 'Microphone Access Denied',
          description: 'Please allow microphone access to use voice commands',
          variant: 'destructive',
        });
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error restarting recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [commands, isListening]);

  const handleCommand = useCallback((action: string, description: string) => {
    setLastCommand(description);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Play sound feedback if enabled
    if (voiceEnabled) {
      playCommandSound();
    }

    // Execute the command
    switch (action) {
      case 'startRecording':
        if (!isRecording) {
          onStartRecording();
          speakFeedback('Recording started');
        } else {
          speakFeedback('Recording is already active');
        }
        break;
      case 'stopRecording':
        if (isRecording) {
          onStopRecording();
          speakFeedback('Recording stopped');
        } else {
          speakFeedback('No active recording to stop');
        }
        break;
      case 'addAction':
        onAddAction();
        speakFeedback('Opening action item dialog');
        break;
      case 'addDecision':
        onAddDecision();
        speakFeedback('Opening decision dialog');
        break;
      case 'generateMinutes':
        if (onGenerateMinutes) {
          onGenerateMinutes();
          speakFeedback('Generating meeting minutes');
        }
        break;
      case 'endMeeting':
        if (onEndMeeting) {
          onEndMeeting();
          speakFeedback('Ending meeting');
        }
        break;
    }

    toast({
      title: 'Voice Command Executed',
      description: description,
    });

    // Clear the last command display after 3 seconds
    timeoutRef.current = setTimeout(() => {
      setLastCommand('');
    }, 3000);
  }, [isRecording, voiceEnabled, onStartRecording, onStopRecording, onAddAction, onAddDecision, onGenerateMinutes, onEndMeeting]);

  const playCommandSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSR0OT6Lg8bllHgU2jtXzzn0pBSh+zPLaizsIGGS57OqfTBAMUKjj8LdjHAQ5kdfy1XwqBCR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUxh9Hz04IzBh5uwO/jmUkdDk+i4PG5ZR4FNo7V885+KQUofsz02os7CBhkuezkn0wQDFCo4/C3YxwEOZHX8tV8KQQkd8fw3ZBBChRctOvrqlYUCkaf4PK+bCEFMYfR89OCMwYebrzvqJlJHQ5PouDxuWUeBTaO1fPOfygFKH7M9NqLOwgYZLns5J9MEAxQqOPwt2McBDmR1/LVfCkEJHfH8N2QQQoUXLTr66pWFApGn+DyvmwhBTGH0fPTgjMGHm6876iZSR0OT6Lg8bllHgU2jtXzzn8oBSh+zPTaizsIGGS57OSfTBAMUKjj8LdjHAQ5kdfy1XwpBCR3x/DdkEEKFFy06+uqVhQKRp/g8r5sIQUxh9Hz04IzBh5uvO+omUkdDk+i4PG5ZR4FNo7V885/KAUofsz02os7CBhkuezkn0wQDFCo4/C3YxwEOZHX8tV8KQQkd8fw3ZBBChRctOvrqlYUCkaf4PK+bCEFMYfR89OCMwYebrzvqJlJHQ5PouDxuWUeBTaO1fPOfygFKH7M9NqLOwgYZLns5J9MEAxQqOPwt2McBDmR1/LVfCkEJHfH8N2QQQoUXLTr66pWFApGn+DyvmwhBTGH0fPTgjMGHm6876iZSR0OT6Lg8bllHgU2jtXzzn8oBSh+zPTaizsIGGS57OSfTBAMUKjj8LdjHAQ5kdfy1XwpBCR3x/DdkEEKFFy06+uqVhQKRp/g8r5sIQUxh9Hz04IzBh5uvO+omUkdDk+i4PG5ZR4FNo7V885/KAUofsz02os7CBhkuezkn0wQDFCo4/C3YxwEOZHX8tV8KQQkd8fw3ZBBChRctOvrqlYUCkaf4PK+bCEFMYfR89OCMwYebrzvqJlJHQ5PouDxuWUeBTaO1fPOfygFKH7M9NqLOwgYZLns5J9MEAxQqOPwt2McBDmR1/LVfCkEJHfH8N2QQQoUXLTr66pWFApGn+DyvmwhBTGH0fPTgjMGHm6876iZSR0OT6Lg8bllHgU2jtXzzn8oBSh+zPTaizsIGGS57OSfTBAMUKjj8LdjHAQ5kdfy1XwpBCR3x/DdkEEKFFy06+uqVhQKRp/g8r5sIQU=');
    audio.volume = 0.3;
    audio.play().catch(e => console.error('Error playing sound:', e));
  };

  const speakFeedback = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.7;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = async () => {
    if (!isListening) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current?.start();
        setIsListening(true);
        toast({
          title: 'Voice Commands Active',
          description: 'Say commands like "start recording" or "add action"',
        });
      } catch (error) {
        console.error('Microphone access error:', error);
        toast({
          title: 'Microphone Access Required',
          description: 'Please allow microphone access to use voice commands',
          variant: 'destructive',
        });
      }
    } else {
      recognitionRef.current?.stop();
      setIsListening(false);
      toast({
        title: 'Voice Commands Disabled',
        description: 'Voice command recognition stopped',
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="h-5 w-5" />
            Voice Commands
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? 'Mute feedback' : 'Enable feedback'}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Badge variant={isListening ? 'default' : 'outline'}>
              {isListening ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={toggleListening}
            variant={isListening ? 'destructive' : 'default'}
            className="gap-2"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? 'Stop Voice Commands' : 'Start Voice Commands'}
          </Button>
        </div>

        {lastCommand && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-sm font-medium text-primary">Last Command:</p>
            <p className="text-sm text-muted-foreground">{lastCommand}</p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Available Commands:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {commands.map((cmd, index) => (
              <div
                key={index}
                className={cn(
                  "p-2 rounded-md border text-xs",
                  cmd.category === 'recording' && "border-blue-500/20 bg-blue-500/5",
                  cmd.category === 'actions' && "border-green-500/20 bg-green-500/5",
                  cmd.category === 'meeting' && "border-purple-500/20 bg-purple-500/5"
                )}
              >
                <p className="font-medium">{cmd.description}</p>
                <p className="text-muted-foreground mt-1">
                  {cmd.phrases.slice(0, 2).join(' or ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 Speak clearly and naturally</p>
          <p>🎤 Works in Amharic and English</p>
          <p>🔊 Audio feedback can be toggled on/off</p>
        </div>
      </CardContent>
    </Card>
  );
};
