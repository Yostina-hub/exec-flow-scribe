import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Mic, MicOff, Send, X, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { RealtimeAssistant, ConversationMessage } from '@/utils/RealtimeAssistant';
import { toast } from 'sonner';

interface CEOAssistantPanelProps {
  briefingData: any;
  currentSlide: number;
  isOpen: boolean;
  onClose: () => void;
  onPausePresentation: () => void;
  onResumePresentation: () => void;
}

export function CEOAssistantPanel({
  briefingData,
  currentSlide,
  isOpen,
  onClose,
  onPausePresentation,
  onResumePresentation
}: CEOAssistantPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const assistantRef = useRef<RealtimeAssistant | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const PROJECT_ID = 'xtqsvwhwzxcutwdbxzyn';

  useEffect(() => {
    if (isOpen && !assistantRef.current) {
      connectAssistant();
    }

    return () => {
      if (assistantRef.current) {
        assistantRef.current.disconnect();
        assistantRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const connectAssistant = async () => {
    try {
      const assistant = new RealtimeAssistant(
        PROJECT_ID,
        (message) => {
          setMessages(prev => [...prev, message]);
        },
        (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'error') {
            toast.error('Assistant connection error');
          }
        },
        (speaking) => {
          setIsAISpeaking(speaking);
          if (speaking) {
            onPausePresentation();
          } else {
            onResumePresentation();
          }
        }
      );

      assistantRef.current = assistant;

      // Create context from briefing data
      const context = {
        currentSlide,
        briefingData: {
          executive_summary: briefingData?.executive_summary,
          key_metrics: briefingData?.key_metrics,
          strengths: briefingData?.strengths,
          concerns: briefingData?.concerns,
          priorities: briefingData?.priorities,
          recommendations: briefingData?.recommendations,
          next_actions: briefingData?.next_actions
        }
      };

      await assistant.connect(context);
      
      toast.success('AI Assistant connected - ask me anything!');
    } catch (error) {
      console.error('Failed to connect assistant:', error);
      toast.error('Failed to connect to assistant');
      setStatus('error');
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !assistantRef.current) return;

    assistantRef.current.sendTextMessage(inputText);
    setInputText('');
  };

  const handleClose = () => {
    if (assistantRef.current) {
      assistantRef.current.disconnect();
      assistantRef.current = null;
    }
    onResumePresentation();
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'inset-0'} z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in`}>
      <Card className={`${isMinimized ? 'w-80' : 'w-full max-w-2xl h-[80vh]'} flex flex-col transition-all duration-300 shadow-2xl`}>
        <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {status === 'connecting' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </div>
                {status === 'connected' && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">AI Executive Assistant</CardTitle>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {status === 'connected' ? 'Ready' : status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAISpeaking && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span>Speaking...</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 p-4 overflow-hidden">
              <ScrollArea className="h-full pr-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Mic className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Ask me anything about the briefing</p>
                    <p className="text-sm">Use voice or text to interact with your AI assistant</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message or use voice..."
                  disabled={status !== 'connected'}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || status !== 'connected'}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {status === 'connected' 
                  ? 'Voice is active - speak naturally to ask questions'
                  : 'Connecting to assistant...'}
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
