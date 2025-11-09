import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Brain, 
  Mic, 
  MicOff, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle2,
  Zap,
  Activity,
  Sparkles,
  Gauge,
  Lightbulb,
  FileCheck,
  Users,
  BarChart3,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { RealtimeAssistant, ConversationMessage } from '@/utils/RealtimeAssistant';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ExecutiveMeetingAdvisorProps {
  meetingId: string;
  isHost: boolean;
  meetingData: any;
  onClose: () => void;
}

interface TempoMetrics {
  currentPace: 'slow' | 'optimal' | 'fast';
  timeRemaining: number;
  agendaProgress: number;
  engagementLevel: number;
  decisionVelocity: number;
}

interface KeyPoint {
  id: string;
  content: string;
  timestamp: Date;
  category: 'decision' | 'action' | 'insight' | 'concern';
  confidence: number;
}

interface SuccessMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'needs-attention';
}

export function ExecutiveMeetingAdvisor({ 
  meetingId, 
  isHost, 
  meetingData,
  onClose 
}: ExecutiveMeetingAdvisorProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('advisor');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const assistantRef = useRef<RealtimeAssistant | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const PROJECT_ID = 'xtqsvwhwzxcutwdbxzyn';

  // Tempo metrics state
  const [tempoMetrics, setTempoMetrics] = useState<TempoMetrics>({
    currentPace: 'optimal',
    timeRemaining: 45,
    agendaProgress: 65,
    engagementLevel: 87,
    decisionVelocity: 72
  });

  // Key points state
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  
  // Success metrics state
  const [successMetrics, setSuccessMetrics] = useState<SuccessMetric[]>([
    { name: 'Participation Balance', value: 85, trend: 'up', status: 'excellent' },
    { name: 'Decision Quality', value: 78, trend: 'stable', status: 'good' },
    { name: 'Time Management', value: 92, trend: 'up', status: 'excellent' },
    { name: 'Action Clarity', value: 88, trend: 'up', status: 'excellent' },
    { name: 'Agenda Coverage', value: 65, trend: 'up', status: 'good' }
  ]);

  useEffect(() => {
    connectAdvisor();
    startRealtimeMonitoring();
    
    return () => {
      if (assistantRef.current) {
        assistantRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const connectAdvisor = async () => {
    try {
      const assistant = new RealtimeAssistant(
        PROJECT_ID,
        (message) => {
          setMessages(prev => [...prev, message]);
          // Extract key points from AI responses
          if (message.role === 'assistant' && message.content.length > 50) {
            extractKeyPoint(message.content);
          }
        },
        (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'error') {
            toast({
              title: "Connection Error",
              description: "Failed to connect to executive advisor",
              variant: "destructive"
            });
          }
        },
        (speaking) => {
          setIsAISpeaking(speaking);
        }
      );

      assistantRef.current = assistant;

      // Create rich context for the advisor
      const context = {
        meetingId,
        isHost,
        role: isHost ? 'host' : 'executive',
        meetingData: {
          title: meetingData?.title,
          agenda: meetingData?.agenda_items,
          participants: meetingData?.meeting_participants?.length || 0,
          duration: meetingData?.duration || 60,
          startTime: meetingData?.start_time,
          currentProgress: tempoMetrics.agendaProgress
        }
      };

      await assistant.connect(context);
      
      toast({
        title: "Executive Advisor Connected",
        description: "Your AI advisor is now monitoring and ready to assist",
      });
    } catch (error) {
      console.error('Failed to connect advisor:', error);
      setStatus('disconnected');
    }
  };

  const startRealtimeMonitoring = () => {
    // Monitor transcriptions for key points
    const channel = supabase
      .channel(`advisor-${meetingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcriptions',
        filter: `meeting_id=eq.${meetingId}`,
      }, (payload) => {
        analyzeTranscription(payload.new);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'decisions',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        updateSuccessMetrics('decision');
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'action_items',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        updateSuccessMetrics('action');
      })
      .subscribe();

    // Simulate tempo updates
    const tempoInterval = setInterval(() => {
      updateTempoMetrics();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(tempoInterval);
    };
  };

  const analyzeTranscription = (transcript: any) => {
    const content = transcript.content?.toLowerCase() || '';
    
    // Detect critical keywords
    const criticalKeywords = [
      { word: 'decision', category: 'decision' as const },
      { word: 'action item', category: 'action' as const },
      { word: 'concern', category: 'concern' as const },
      { word: 'risk', category: 'concern' as const },
      { word: 'opportunity', category: 'insight' as const },
      { word: 'priority', category: 'insight' as const }
    ];

    criticalKeywords.forEach(({ word, category }) => {
      if (content.includes(word)) {
        const keyPoint: KeyPoint = {
          id: Date.now().toString() + Math.random(),
          content: transcript.content.substring(0, 150),
          timestamp: new Date(),
          category,
          confidence: 0.85
        };
        setKeyPoints(prev => [keyPoint, ...prev].slice(0, 20));
      }
    });
  };

  const extractKeyPoint = (content: string) => {
    // Extract insights from AI advisor responses
    if (content.includes('recommend') || content.includes('suggest') || content.includes('important')) {
      const keyPoint: KeyPoint = {
        id: Date.now().toString() + Math.random(),
        content: content.substring(0, 150),
        timestamp: new Date(),
        category: 'insight',
        confidence: 0.92
      };
      setKeyPoints(prev => [keyPoint, ...prev].slice(0, 20));
    }
  };

  const updateTempoMetrics = () => {
    setTempoMetrics(prev => ({
      ...prev,
      timeRemaining: Math.max(0, prev.timeRemaining - 1),
      agendaProgress: Math.min(100, prev.agendaProgress + Math.random() * 2),
      engagementLevel: 75 + Math.random() * 20,
      decisionVelocity: 60 + Math.random() * 30
    }));
  };

  const updateSuccessMetrics = (type: 'decision' | 'action') => {
    setSuccessMetrics(prev => prev.map(metric => {
      if (type === 'decision' && metric.name === 'Decision Quality') {
        return { ...metric, value: Math.min(100, metric.value + 2), trend: 'up' as const };
      }
      if (type === 'action' && metric.name === 'Action Clarity') {
        return { ...metric, value: Math.min(100, metric.value + 2), trend: 'up' as const };
      }
      return metric;
    }));
  };

  const getPaceColor = (pace: string) => {
    switch (pace) {
      case 'slow': return 'text-yellow-500';
      case 'fast': return 'text-red-500';
      default: return 'text-green-500';
    }
  };

  const getPaceIcon = (pace: string) => {
    switch (pace) {
      case 'slow': return <Clock className="h-5 w-5" />;
      case 'fast': return <Zap className="h-5 w-5" />;
      default: return <CheckCircle2 className="h-5 w-5" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'decision': return <Target className="h-4 w-4 text-blue-500" />;
      case 'action': return <Zap className="h-4 w-4 text-green-500" />;
      case 'insight': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'concern': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs-attention': return 'text-yellow-600';
      default: return 'text-muted-foreground';
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          size="lg"
          className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 hover:scale-110 transition-transform"
        >
          <Brain className="h-8 w-8 animate-pulse" />
        </Button>
        {isAISpeaking && (
          <div className="absolute -top-2 -right-2 flex gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-4 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
    >
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl border-2 border-primary/20">
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Brain className="h-6 w-6 animate-pulse" />
                </div>
                {status === 'connected' && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Executive Meeting Advisor</CardTitle>
                <p className="text-sm text-white/80 mt-1">
                  Real-time AI coaching • Tempo management • Success optimization
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-3 py-1">
                {status === 'connected' ? (
                  <span className="flex items-center gap-2">
                    <Activity className="h-3 w-3 animate-pulse" />
                    Live Monitoring
                  </span>
                ) : (
                  status
                )}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(true)}
                className="text-white hover:bg-white/20"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-6 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="advisor" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Advisor
              </TabsTrigger>
              <TabsTrigger value="tempo" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Meeting Tempo
              </TabsTrigger>
              <TabsTrigger value="keypoints" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Key Points
                {keyPoints.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{keyPoints.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="success" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Success Metrics
              </TabsTrigger>
            </TabsList>

            {/* AI Advisor Tab */}
            <TabsContent value="advisor" className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/20">
                <CardHeader className="pb-3 bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className={isAISpeaking ? 'animate-pulse text-green-500' : ''} />
                    Live Conversation
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4 overflow-hidden">
                  <ScrollArea className="h-full pr-4" ref={scrollRef}>
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Brain className="h-16 w-16 mb-4 text-primary/30 animate-pulse" />
                        <h3 className="text-xl font-semibold mb-2">Your AI Advisor is Ready</h3>
                        <p className="text-muted-foreground max-w-md">
                          Ask me about meeting strategy, tempo management, decision-making, 
                          or how to improve meeting outcomes. I'm analyzing everything in real-time.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl p-4 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted border border-border'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <p className="text-xs opacity-60 mt-2">
                                {msg.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                        {isAISpeaking && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl p-4 border border-border">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                                <span className="text-sm text-muted-foreground">Speaking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Meeting Tempo Tab */}
            <TabsContent value="tempo" className="flex-1 space-y-4 overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gauge className="h-5 w-5" />
                      Current Pace
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className={`text-center ${getPaceColor(tempoMetrics.currentPace)}`}>
                        {getPaceIcon(tempoMetrics.currentPace)}
                        <p className="text-3xl font-bold mt-4 capitalize">{tempoMetrics.currentPace}</p>
                        <p className="text-sm text-muted-foreground mt-2">Meeting velocity</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Time Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Time Remaining</span>
                          <span className="font-bold">{tempoMetrics.timeRemaining} min</span>
                        </div>
                        <Progress value={(tempoMetrics.timeRemaining / 60) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Agenda Progress</span>
                          <span className="font-bold">{tempoMetrics.agendaProgress}%</span>
                        </div>
                        <Progress value={tempoMetrics.agendaProgress} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Engagement Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-green-600">{Math.round(tempoMetrics.engagementLevel)}%</div>
                        <p className="text-sm text-muted-foreground mt-2">Participant engagement</p>
                        <Badge variant="secondary" className="mt-4">Excellent</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Decision Velocity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-blue-600">{Math.round(tempoMetrics.decisionVelocity)}%</div>
                        <p className="text-sm text-muted-foreground mt-2">Decision-making speed</p>
                        <Badge variant="secondary" className="mt-4">On Track</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Key Points Tab */}
            <TabsContent value="keypoints" className="flex-1 overflow-auto">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {keyPoints.length === 0 ? (
                    <div className="text-center py-12">
                      <FileCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        Key points will appear automatically as the meeting progresses
                      </p>
                    </div>
                  ) : (
                    keyPoints.map((point) => (
                      <motion.div
                        key={point.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <Card className="border-l-4 hover:shadow-md transition-shadow" style={{
                          borderLeftColor: point.category === 'decision' ? '#3b82f6' : 
                                         point.category === 'action' ? '#10b981' :
                                         point.category === 'concern' ? '#ef4444' : '#eab308'
                        }}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {getCategoryIcon(point.category)}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="capitalize">
                                    {point.category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {point.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed">{point.content}</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={point.confidence * 100} className="h-1 flex-1" />
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(point.confidence * 100)}% confidence
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Success Metrics Tab */}
            <TabsContent value="success" className="flex-1 space-y-4 overflow-auto">
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Overall Meeting Success
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-7xl font-bold text-green-600">
                        {Math.round(successMetrics.reduce((acc, m) => acc + m.value, 0) / successMetrics.length)}
                      </div>
                      <p className="text-lg text-muted-foreground mt-2">Success Score</p>
                      <Badge variant="default" className="mt-4 text-lg px-6 py-2">Outstanding Performance</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                {successMetrics.map((metric, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold">{metric.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                              {metric.value}%
                            </span>
                            <TrendingUp className={`h-4 w-4 ${
                              metric.trend === 'up' ? 'text-green-500' :
                              metric.trend === 'down' ? 'text-red-500 rotate-180' :
                              'text-muted-foreground'
                            }`} />
                          </div>
                        </div>
                        <Progress value={metric.value} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2 capitalize">
                          Status: {metric.status.replace('-', ' ')}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
