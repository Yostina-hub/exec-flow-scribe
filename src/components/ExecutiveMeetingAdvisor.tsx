import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  Maximize2,
  Send,
  History,
  Search,
  Filter,
  Calendar,
  MessageCircleQuestion,
  Loader2
} from 'lucide-react';
import { RealtimeAssistant, ConversationMessage } from '@/utils/RealtimeAssistant';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AdvisorHistoryViewer } from './AdvisorHistoryViewer';

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

interface Transcription {
  id: string;
  content: string;
  speaker_id: string;
  timestamp: string;
  profiles?: {
    full_name: string;
  };
}

interface ParticipantQuestion {
  id: string;
  question: string;
  askedBy: string;
  askedByName?: string;
  timestamp: string;
  answer?: string;
  answeredBy?: string;
  answeredByName?: string;
  answeredAt?: string;
  ai_suggestion?: string;
  ai_suggestion_confidence?: number;
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
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
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

  // Live transcriptions state
  const [liveTranscriptions, setLiveTranscriptions] = useState<Transcription[]>([]);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');

  // Participant questions state
  const [participantQuestions, setParticipantQuestions] = useState<ParticipantQuestion[]>([]);
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});
  const [generatingSuggestion, setGeneratingSuggestion] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    connectAdvisor();
    const cleanup = startRealtimeMonitoring();
    loadRecentTranscriptions();
    loadParticipantQuestions();
    
    return () => {
      if (assistantRef.current) {
        assistantRef.current.disconnect();
      }
      endConversationSession();
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [liveTranscriptions]);

  const createConversationSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('advisor_conversations')
        .insert({
          meeting_id: meetingId,
          user_id: user.id,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to create conversation session:', error);
      return null;
    }
  };

  const saveMessageToHistory = async (message: ConversationMessage) => {
    if (!conversationId) return;

    try {
      await supabase
        .from('advisor_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.toISOString()
        });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const endConversationSession = async () => {
    if (!conversationId) return;

    try {
      // Extract key insights from the conversation
      const insights = keyPoints.slice(0, 5).map(kp => ({
        content: kp.content,
        category: kp.category,
        confidence: kp.confidence
      }));

      await supabase
        .from('advisor_conversations')
        .update({
          ended_at: new Date().toISOString(),
          key_insights: insights
        })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  const connectAdvisor = async () => {
    try {
      console.log('Starting advisor connection...');
      
      // Create conversation session
      const sessionId = await createConversationSession();
      setConversationId(sessionId);
      console.log('Conversation session created:', sessionId);

      const assistant = new RealtimeAssistant(
        PROJECT_ID,
        (message) => {
          console.log('Received message:', message);
          setMessages(prev => [...prev, message]);
          // Save to history
          saveMessageToHistory(message);
          // Extract key points from AI responses
          if (message.role === 'assistant' && message.content.length > 50) {
            extractKeyPoint(message.content);
          }
        },
        (newStatus) => {
          console.log('Status changed to:', newStatus);
          setStatus(newStatus);
          if (newStatus === 'error') {
            toast({
              title: "Connection Error",
              description: "Failed to connect to executive advisor. Check console for details.",
              variant: "destructive"
            });
          } else if (newStatus === 'connected') {
            toast({
              title: "Executive Advisor Connected",
              description: "Your AI advisor is now monitoring and ready to assist",
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

      console.log('Connecting with context:', context);
      await assistant.connect(context);
      
    } catch (error) {
      console.error('Failed to connect advisor:', error);
      setStatus('error');
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to initialize advisor",
        variant: "destructive"
      });
    }
  };

  const loadRecentTranscriptions = async () => {
    try {
      console.log('Loading transcriptions for meeting:', meetingId);
      const { data: transcripts, error: transcriptsError } = await supabase
        .from('transcriptions')
        .select('id, content, speaker_id, timestamp')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true })
        .limit(50);

      if (transcriptsError) {
        console.error('Error loading transcriptions:', transcriptsError);
        throw transcriptsError;
      }
      
      console.log('Found transcriptions:', transcripts?.length || 0);
      
      if (transcripts && transcripts.length > 0) {
        // Fetch profiles separately
        const speakerIds = [...new Set(transcripts.map(t => t.speaker_id).filter(Boolean))];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', speakerIds);

        console.log('Loaded speaker profiles:', profiles?.length || 0);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        const enrichedTranscripts: Transcription[] = transcripts.map(t => ({
          ...t,
          profiles: t.speaker_id && profileMap.has(t.speaker_id) 
            ? { full_name: profileMap.get(t.speaker_id)! } 
            : undefined
        }));
        
        setLiveTranscriptions(enrichedTranscripts);
        console.log('Set live transcriptions:', enrichedTranscripts.length);
      }
    } catch (error) {
      console.error('Error loading transcriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load transcriptions",
        variant: "destructive"
      });
    }
  };

  const loadParticipantQuestions = async () => {
    try {
      console.log('Loading participant questions for meeting:', meetingId);
      const { data, error } = await supabase
        .from('meeting_questions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('generated_at', { ascending: false });

      if (error) {
        console.error('Error loading questions:', error);
        throw error;
      }

      console.log('Found questions:', data?.length || 0);

      if (data) {
        // Fetch profile info for answerers
        const userIds = [...new Set(data.map(q => q.answered_by).filter(Boolean))];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        const questions: ParticipantQuestion[] = data.map(q => ({
          id: q.id,
          question: q.question,
          askedBy: '',
          askedByName: 'Participant',
          timestamp: q.generated_at,
          answer: q.answer || undefined,
          answeredBy: q.answered_by || undefined,
          answeredByName: q.answered_by ? profileMap.get(q.answered_by) : undefined,
          answeredAt: q.answered_at || undefined,
          ai_suggestion: q.ai_suggestion || undefined,
          ai_suggestion_confidence: q.ai_suggestion_confidence || undefined
        }));

        setParticipantQuestions(questions);
        console.log('Set participant questions:', questions.length);
      }
    } catch (error) {
      console.error('Error loading participant questions:', error);
      toast({
        title: "Error",
        description: "Failed to load Q&A",
        variant: "destructive"
      });
    }
  };

  const detectQuestion = (content: string): boolean => {
    // Check if content contains question mark or question words
    const questionIndicators = [
      '?',
      /\b(what|how|why|when|where|who|which|whose|whom|can|could|would|should|is|are|do|does|did)\b/i
    ];

    return questionIndicators.some(indicator => {
      if (typeof indicator === 'string') {
        return content.includes(indicator);
      }
      return indicator.test(content);
    });
  };

  const saveParticipantQuestion = async (content: string, speakerId: string, speakerName: string) => {
    try {
      const { data, error } = await supabase
        .from('meeting_questions')
        .insert({
          meeting_id: meetingId,
          question: content,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newQuestion: ParticipantQuestion = {
          id: data.id,
          question: data.question,
          askedBy: speakerId,
          askedByName: speakerName,
          timestamp: data.generated_at
        };
        
        setParticipantQuestions(prev => [newQuestion, ...prev]);
        
        toast({
          title: "Question Detected",
          description: `Question from ${speakerName} added to Q&A`,
        });

        // Generate AI suggestion automatically
        generateAISuggestion(data.id);
      }
    } catch (error) {
      console.error('Error saving participant question:', error);
    }
  };

  const generateAISuggestion = async (questionId: string) => {
    setGeneratingSuggestion(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-answer-suggestion', {
        body: { questionId, meetingId }
      });

      if (error) throw error;

      if (data?.suggestion) {
        // Update local state
        setParticipantQuestions(prev =>
          prev.map(q =>
            q.id === questionId
              ? {
                  ...q,
                  ai_suggestion: data.suggestion,
                  ai_suggestion_confidence: data.confidence
                }
              : q
          )
        );
      }
    } catch (error: any) {
      console.error('Error generating AI suggestion:', error);
      toast({
        title: "Suggestion Error",
        description: error.message || "Failed to generate AI suggestion",
        variant: "destructive"
      });
    } finally {
      setGeneratingSuggestion(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const answerParticipantQuestion = async (questionId: string) => {
    const answer = answerText[questionId]?.trim();
    if (!answer) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('meeting_questions')
        .update({
          answer,
          answered_by: user.id,
          answered_at: new Date().toISOString()
        })
        .eq('id', questionId);

      if (error) throw error;

      // Update local state
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      setParticipantQuestions(prev =>
        prev.map(q =>
          q.id === questionId
            ? {
                ...q,
                answer,
                answeredBy: user.id,
                answeredByName: profile?.full_name,
                answeredAt: new Date().toISOString()
              }
            : q
        )
      );

      setAnswerText(prev => ({ ...prev, [questionId]: '' }));

      toast({
        title: "Answer Submitted",
        description: "Your answer has been recorded",
      });
    } catch (error) {
      console.error('Error answering question:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer",
        variant: "destructive"
      });
    }
  };

  const startRealtimeMonitoring = () => {
    // Monitor transcriptions for key points and live display
    const channel = supabase
      .channel(`advisor-${meetingId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcriptions',
        filter: `meeting_id=eq.${meetingId}`,
      }, async (payload) => {
        analyzeTranscription(payload.new);
        
        // Fetch speaker info for new transcription
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', payload.new.speaker_id)
          .single();

        const newTranscript: Transcription = {
          id: payload.new.id,
          content: payload.new.content,
          speaker_id: payload.new.speaker_id,
          timestamp: payload.new.timestamp,
          profiles: profile ? { full_name: profile.full_name } : undefined
        };
        
        setLiveTranscriptions(prev => [...prev, newTranscript]);

        // Detect if this is a question
        if (detectQuestion(payload.new.content)) {
          await saveParticipantQuestion(
            payload.new.content,
            payload.new.speaker_id,
            profile?.full_name || 'Unknown'
          );
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_questions',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        loadParticipantQuestions();
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

  const handleSendMessage = () => {
    if (!inputText.trim() || !assistantRef.current) return;
    assistantRef.current.sendTextMessage(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filter transcriptions based on search and filters
  const getFilteredTranscriptions = () => {
    let filtered = [...liveTranscriptions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.content.toLowerCase().includes(query) ||
        t.profiles?.full_name?.toLowerCase().includes(query)
      );
    }

    // Speaker filter
    if (selectedSpeaker !== 'all') {
      filtered = filtered.filter(t => t.speaker_id === selectedSpeaker);
    }

    // Time range filter
    if (timeRange !== 'all') {
      const now = new Date();
      const cutoffTime = new Date();
      
      switch (timeRange) {
        case '5min':
          cutoffTime.setMinutes(now.getMinutes() - 5);
          break;
        case '15min':
          cutoffTime.setMinutes(now.getMinutes() - 15);
          break;
        case '30min':
          cutoffTime.setMinutes(now.getMinutes() - 30);
          break;
        case '1hour':
          cutoffTime.setHours(now.getHours() - 1);
          break;
      }
      
      filtered = filtered.filter(t => new Date(t.timestamp) >= cutoffTime);
    }

    return filtered;
  };

  // Get unique speakers for filter dropdown
  const uniqueSpeakers = Array.from(
    new Map(
      liveTranscriptions
        .filter(t => t.speaker_id && t.profiles?.full_name)
        .map(t => [t.speaker_id, t.profiles?.full_name])
    ).entries()
  ).map(([id, name]) => ({ id, name: name || 'Unknown' }));

  const filteredTranscriptions = getFilteredTranscriptions();

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

        <CardContent className="flex-1 p-4 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-7 w-full shrink-0 h-auto py-1.5">
              <TabsTrigger value="advisor" className="flex items-center gap-1.5 text-xs py-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">AI Coach</span>
                {isAISpeaking && (
                  <Badge variant="default" className="ml-1 animate-pulse bg-green-500 text-xs px-1.5 py-0">
                    Live
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="questions" className="flex items-center gap-1.5 text-xs py-2">
                <MessageCircleQuestion className="h-4 w-4" />
                <span className="hidden sm:inline">Q&A</span>
                {participantQuestions.filter(q => !q.answer).length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                    {participantQuestions.filter(q => !q.answer).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transcriptions" className="flex items-center gap-1.5 text-xs py-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Live Talk</span>
                {liveTranscriptions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{liveTranscriptions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tempo" className="flex items-center gap-1.5 text-xs py-2">
                <Gauge className="h-4 w-4" />
                <span className="hidden sm:inline">Tempo</span>
              </TabsTrigger>
              <TabsTrigger value="keypoints" className="flex items-center gap-1.5 text-xs py-2">
                <FileCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Key Points</span>
                {keyPoints.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">{keyPoints.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="success" className="flex items-center gap-1.5 text-xs py-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Metrics</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs py-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            {/* AI Advisor Tab */}
            <TabsContent value="advisor" className="flex-1 flex flex-col overflow-hidden">
              <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/20">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mic className={isAISpeaking ? 'animate-pulse text-green-500' : ''} />
                      Live Conversation
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={status === 'connected' ? 'default' : 'secondary'} className="text-xs">
                        {status === 'connected' ? (
                          <>
                            <Activity className="h-3 w-3 mr-1 animate-pulse" />
                            Voice Active
                          </>
                        ) : (
                          status
                        )}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use voice or text to interact with your AI advisor
                  </p>
                </CardHeader>
                <CardContent className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                  <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Brain className="h-16 w-16 mb-4 text-primary/30 animate-pulse" />
                        <h3 className="text-xl font-semibold mb-2">Your AI Advisor is Ready</h3>
                        <p className="text-muted-foreground max-w-md mb-4">
                          Ask me about meeting strategy, tempo management, decision-making, 
                          or how to improve meeting outcomes. I'm analyzing everything in real-time.
                        </p>
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                          <p>💬 Type a message below</p>
                          <p>🎤 Or just speak naturally</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-4">
                        {messages.map((msg, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
                                msg.role === 'user'
                                  ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
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
                            <div className="bg-muted rounded-2xl p-4 border border-border shadow-sm">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                                <span className="text-sm text-muted-foreground">AI is speaking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Text Input Area */}
                  <div className="border-t pt-4">
                    <div className="flex gap-2">
                      <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={status === 'connected' ? 'Type a message or speak...' : 'Connecting...'}
                        disabled={status !== 'connected'}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || status !== 'connected'}
                        size="icon"
                        className="shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                      {status === 'connected' ? (
                        <>
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Voice is active - speak naturally or type your questions
                        </>
                      ) : (
                        'Connecting to AI advisor...'
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Participant Q&A Tab */}
            <TabsContent value="questions" className="flex-1 flex flex-col overflow-hidden mt-2 space-y-0">
              <Card className="flex-1 flex flex-col overflow-hidden border-2 border-blue-500/20">
                <CardHeader className="py-3 px-4 bg-muted/30 shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircleQuestion className="h-5 w-5 text-blue-600" />
                      Participant Questions & Answers
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {participantQuestions.filter(q => !q.answer).length} Pending
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Questions automatically detected from participant conversations
                  </p>
                </CardHeader>
                <CardContent className="flex-1 p-3 overflow-hidden">
                  <ScrollArea className="h-full pr-3">
                    {participantQuestions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageCircleQuestion className="h-16 w-16 mb-4 text-blue-500/30" />
                        <h3 className="text-xl font-semibold mb-2">No Questions Yet</h3>
                        <p className="text-muted-foreground max-w-md">
                          When participants ask questions during the meeting, they'll appear here automatically for answering.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-4">
                        {/* Unanswered Questions */}
                        {participantQuestions.filter(q => !q.answer).length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-yellow-600">
                              <Clock className="h-4 w-4" />
                              Pending Questions ({participantQuestions.filter(q => !q.answer).length})
                            </div>
                            {participantQuestions.filter(q => !q.answer).map((q) => (
                              <Card key={q.id} className="border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/10">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium mb-1">{q.question}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-semibold">{q.askedByName}</span>
                                        <span>•</span>
                                        <span>{new Date(q.timestamp).toLocaleTimeString()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* AI Suggestion */}
                                  {generatingSuggestion[q.id] ? (
                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                                      <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>AI is analyzing meeting context to suggest an answer...</span>
                                      </div>
                                    </div>
                                  ) : q.ai_suggestion ? (
                                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Sparkles className="h-4 w-4 text-blue-600" />
                                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">AI Suggested Answer</span>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                          {Math.round((q.ai_suggestion_confidence || 0) * 100)}% confidence
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-blue-900 dark:text-blue-100">{q.ai_suggestion}</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAnswerText({ ...answerText, [q.id]: q.ai_suggestion || '' })}
                                        className="w-full text-xs"
                                      >
                                        Use This Answer
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => generateAISuggestion(q.id)}
                                      className="w-full text-xs"
                                    >
                                      <Sparkles className="h-3 w-3 mr-2" />
                                      Generate AI Suggestion
                                    </Button>
                                  )}

                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Type your answer..."
                                      value={answerText[q.id] || ''}
                                      onChange={(e) =>
                                        setAnswerText({ ...answerText, [q.id]: e.target.value })
                                      }
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') answerParticipantQuestion(q.id);
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => answerParticipantQuestion(q.id)}
                                      disabled={!answerText[q.id]?.trim()}
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* Answered Questions */}
                        {participantQuestions.filter(q => q.answer).length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Answered Questions ({participantQuestions.filter(q => q.answer).length})
                            </div>
                            {participantQuestions.filter(q => q.answer).map((q) => (
                              <Card key={q.id} className="border-green-500/30 bg-green-50 dark:bg-green-900/10">
                                <CardContent className="p-4 space-y-3">
                                  <div>
                                    <p className="text-sm font-medium mb-1">{q.question}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-semibold">{q.askedByName}</span>
                                      <span>•</span>
                                      <span>{new Date(q.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                  <div className="bg-background p-3 rounded-md border-l-4 border-green-500">
                                    <p className="text-sm mb-2">{q.answer}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-semibold">Answer by: {q.answeredByName || 'Unknown'}</span>
                                      <span>•</span>
                                      <span>{q.answeredAt ? new Date(q.answeredAt).toLocaleTimeString() : ''}</span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Live Transcriptions Tab */}
            <TabsContent value="transcriptions" className="flex-1 flex flex-col overflow-hidden mt-2 space-y-0">
              <Card className="flex-1 flex flex-col overflow-hidden border-2 border-green-500/20">
                <CardHeader className="py-3 px-4 bg-muted/30 shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Live Participant Conversations
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {filteredTranscriptions.length} / {liveTranscriptions.length}
                    </Badge>
                  </div>
                   <p className="text-xs text-muted-foreground mt-1">
                     Real-time transcription of what participants are saying
                   </p>
                </CardHeader>
                <CardContent className="flex-1 p-3 overflow-hidden flex flex-col gap-2">
                  {/* Search and Filter Controls */}
                  <div className="space-y-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by keyword or speaker name..."
                        className="pl-8 h-9 text-sm"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Filter by speaker" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Speakers</SelectItem>
                          {uniqueSpeakers.map(speaker => (
                            <SelectItem key={speaker.id} value={speaker.id}>
                              {speaker.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Time range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="5min">Last 5 minutes</SelectItem>
                          <SelectItem value="15min">Last 15 minutes</SelectItem>
                          <SelectItem value="30min">Last 30 minutes</SelectItem>
                          <SelectItem value="1hour">Last hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(searchQuery || selectedSpeaker !== 'all' || timeRange !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedSpeaker('all');
                          setTimeRange('all');
                        }}
                        className="w-full h-8 text-xs"
                      >
                        <X className="h-3 w-3 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                
                  <ScrollArea className="flex-1 h-full pr-3" ref={transcriptScrollRef}>
                    {filteredTranscriptions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Users className="h-16 w-16 mb-4 text-green-500/30" />
                        <h3 className="text-xl font-semibold mb-2">
                          {liveTranscriptions.length === 0 ? 'No Conversations Yet' : 'No Results Found'}
                        </h3>
                        <p className="text-muted-foreground max-w-md">
                          {liveTranscriptions.length === 0 
                            ? 'Participant conversations will appear here in real-time as they speak during the meeting.'
                            : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 pb-4">
                        {filteredTranscriptions.map((transcript) => (
                          <motion.div
                            key={transcript.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="border-l-4 border-green-500 pl-4 py-2"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-green-700">
                                    {transcript.profiles?.full_name?.charAt(0) || '?'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">
                                    {transcript.profiles?.full_name || 'Unknown Speaker'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(transcript.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm mt-2 leading-relaxed ml-10">
                              {searchQuery && transcript.content.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                <span dangerouslySetInnerHTML={{
                                  __html: transcript.content.replace(
                                    new RegExp(`(${searchQuery})`, 'gi'),
                                    '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>'
                                  )
                                }} />
                              ) : (
                                transcript.content
                              )}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Meeting Tempo Tab */}
            <TabsContent value="tempo" className="flex-1 overflow-hidden mt-2 space-y-0">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 gap-3 p-3">
                  <Card className="border-2 border-primary/20">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center gap-2">
                      <Gauge className="h-5 w-5" />
                      Current Pace
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center py-6">
                      <div className={`text-center ${getPaceColor(tempoMetrics.currentPace)}`}>
                        {getPaceIcon(tempoMetrics.currentPace)}
                        <p className="text-2xl font-bold mt-3 capitalize">{tempoMetrics.currentPace}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">Meeting velocity</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Time Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span>Time Remaining</span>
                          <span className="font-bold">{tempoMetrics.timeRemaining} min</span>
                        </div>
                        <Progress value={(tempoMetrics.timeRemaining / 60) * 100} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span>Agenda Progress</span>
                          <span className="font-bold">{tempoMetrics.agendaProgress}%</span>
                        </div>
                        <Progress value={tempoMetrics.agendaProgress} className="h-1.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Engagement Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center py-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-600">{Math.round(tempoMetrics.engagementLevel)}%</div>
                        <p className="text-xs text-muted-foreground mt-1.5">Participant engagement</p>
                        <Badge variant="secondary" className="mt-3 text-xs">Excellent</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-primary/20">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Decision Velocity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center py-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600">{Math.round(tempoMetrics.decisionVelocity)}%</div>
                        <p className="text-xs text-muted-foreground mt-1.5">Decision-making speed</p>
                        <Badge variant="secondary" className="mt-3 text-xs">On Track</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Key Points Tab */}
            <TabsContent value="keypoints" className="flex-1 overflow-hidden mt-2 space-y-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
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
            <TabsContent value="success" className="flex-1 overflow-hidden mt-2 space-y-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  <Card className="border-2 border-primary/20">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Overall Meeting Success
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center py-6">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-green-600">
                            {Math.round(successMetrics.reduce((acc, m) => acc + m.value, 0) / successMetrics.length)}
                          </div>
                          <p className="text-base text-muted-foreground mt-2">Success Score</p>
                          <Badge variant="default" className="mt-3 text-sm px-4 py-1.5">Outstanding Performance</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                {successMetrics.map((metric, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                      <Card className="border-l-4 border-l-primary">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{metric.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xl font-bold ${getStatusColor(metric.status)}`}>
                                {metric.value}%
                              </span>
                              <TrendingUp className={`h-3.5 w-3.5 ${
                                metric.trend === 'up' ? 'text-green-500' :
                                metric.trend === 'down' ? 'text-red-500 rotate-180' :
                                'text-muted-foreground'
                              }`} />
                            </div>
                          </div>
                          <Progress value={metric.value} className="h-1.5" />
                          <p className="text-xs text-muted-foreground mt-1.5 capitalize">
                            Status: {metric.status.replace('-', ' ')}
                          </p>
                        </CardContent>
                      </Card>
                  </motion.div>
                  ))}
                </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-hidden mt-2 space-y-0">
              <div className="h-full">
              <AdvisorHistoryViewer meetingId={meetingId} currentConversationId={conversationId} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
