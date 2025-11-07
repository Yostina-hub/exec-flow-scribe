import { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Search, Star, Download, Filter, User, Clock, Sparkles, 
  Activity, Brain, Zap, TrendingUp, Heart, AlertCircle,
  Volume2, Mic, Award, Target, Smile, Frown, Meh, ThumbsUp,
  ThumbsDown, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Transcription {
  id: string;
  content: string;
  speaker_name: string | null;
  timestamp: string;
  confidence_score: number | null;
  detected_language?: string;
}

interface EmotionalAnalysis {
  id: string;
  transcription_id: string;
  primary_emotion: string;
  emotion_score: number;
  secondary_emotions: string[];
  sentiment: string;
  energy_level: string;
  confidence: number;
}

interface RevolutionaryTranscriptionProps {
  transcriptions: Transcription[];
  onHighlight?: (transcriptionId: string, content: string) => void;
  isRecording?: boolean;
  audioLevel?: number;
  meetingId: string;
}

// Particle animation component
const TranscriptionParticle = ({ x, y, delay }: { x: number; y: number; delay: number }) => (
  <motion.div
    className="absolute w-1 h-1 rounded-full bg-primary"
    initial={{ opacity: 0, scale: 0, x, y }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0, 1.5, 0],
      x: x + (Math.random() - 0.5) * 100,
      y: y - Math.random() * 100,
    }}
    transition={{
      duration: 2,
      delay,
      ease: "easeOut"
    }}
  />
);

// Waveform visualizer
const WaveformVisualizer = ({ audioLevel }: { audioLevel: number }) => {
  const bars = 50;
  
  return (
    <div className="flex items-center justify-center gap-1 h-16 px-4">
      {Array.from({ length: bars }).map((_, i) => {
        const height = Math.sin(i * 0.3) * audioLevel * 50 + audioLevel * 20;
        return (
          <motion.div
            key={i}
            className="w-1 bg-gradient-to-t from-primary via-primary/70 to-primary/30 rounded-full"
            animate={{
              height: Math.max(4, height),
            }}
            transition={{
              duration: 0.1,
              ease: "easeOut"
            }}
          />
        );
      })}
    </div>
  );
};

// AI Insight Badge
const AIInsight = ({ text, icon: Icon, color }: { text: string; icon: any; color: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border",
      color
    )}
  >
    <Icon className="h-3 w-3" />
    {text}
  </motion.div>
);

// Sentiment indicator
const getSentiment = (text: string) => {
  const positive = /\b(great|excellent|amazing|wonderful|fantastic|good|happy|excited)\b/gi;
  const negative = /\b(bad|terrible|awful|disappointed|angry|frustrated|sad)\b/gi;
  const question = /\?|how|what|why|when|where/gi;
  
  if (text.match(question)) return { type: 'question', icon: AlertCircle, color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' };
  if (text.match(positive)) return { type: 'positive', icon: Heart, color: 'bg-green-500/10 text-green-700 border-green-500/20' };
  if (text.match(negative)) return { type: 'negative', icon: TrendingUp, color: 'bg-red-500/10 text-red-700 border-red-500/20' };
  return { type: 'neutral', icon: Activity, color: 'bg-gray-500/10 text-gray-700 border-gray-500/20' };
};

// Key moment detector
const isKeyMoment = (text: string) => {
  const keywords = /\b(decision|important|critical|key|action|deadline|milestone|agreed|approved)\b/gi;
  return text.match(keywords);
};

// Emotion to icon/color mapping
const EMOTION_CONFIG: Record<string, { icon: any; color: string; bgGradient: string }> = {
  joy: { icon: Smile, color: 'text-yellow-600', bgGradient: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30' },
  happiness: { icon: Smile, color: 'text-yellow-600', bgGradient: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30' },
  excitement: { icon: Sparkles, color: 'text-orange-600', bgGradient: 'from-orange-500/20 to-orange-500/5 border-orange-500/30' },
  sadness: { icon: Frown, color: 'text-blue-600', bgGradient: 'from-blue-500/20 to-blue-500/5 border-blue-500/30' },
  anger: { icon: AlertTriangle, color: 'text-red-600', bgGradient: 'from-red-500/20 to-red-500/5 border-red-500/30' },
  frustration: { icon: AlertCircle, color: 'text-orange-600', bgGradient: 'from-orange-500/20 to-orange-500/5 border-orange-500/30' },
  fear: { icon: AlertCircle, color: 'text-purple-600', bgGradient: 'from-purple-500/20 to-purple-500/5 border-purple-500/30' },
  anxiety: { icon: Heart, color: 'text-purple-600', bgGradient: 'from-purple-500/20 to-purple-500/5 border-purple-500/30' },
  surprise: { icon: Zap, color: 'text-cyan-600', bgGradient: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30' },
  confidence: { icon: ThumbsUp, color: 'text-green-600', bgGradient: 'from-green-500/20 to-green-500/5 border-green-500/30' },
  uncertainty: { icon: ThumbsDown, color: 'text-gray-600', bgGradient: 'from-gray-500/20 to-gray-500/5 border-gray-500/30' },
  neutral: { icon: Meh, color: 'text-gray-600', bgGradient: 'from-gray-500/20 to-gray-500/5 border-gray-500/30' },
};

const getEmotionConfig = (emotion: string) => {
  return EMOTION_CONFIG[emotion.toLowerCase()] || EMOTION_CONFIG.neutral;
};

export const RevolutionaryTranscription = ({
  transcriptions,
  onHighlight,
  isRecording = false,
  audioLevel = 0,
  meetingId
}: RevolutionaryTranscriptionProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [emotionalAnalyses, setEmotionalAnalyses] = useState<Map<string, EmotionalAnalysis>>(new Map());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Extract unique speakers
  const speakers = useMemo(() => {
    return [...new Set(transcriptions.map(t => t.speaker_name || 'Unknown'))];
  }, [transcriptions]);

  // Fetch existing emotional analyses
  useEffect(() => {
    const fetchEmotionalAnalyses = async () => {
      const { data, error } = await supabase
        .from('emotional_analysis')
        .select('*')
        .eq('meeting_id', meetingId);

      if (!error && data) {
        const analysesMap = new Map(
          data.map(a => [
            a.transcription_id, 
            {
              ...a,
              secondary_emotions: Array.isArray(a.secondary_emotions) 
                ? a.secondary_emotions 
                : []
            } as EmotionalAnalysis
          ])
        );
        setEmotionalAnalyses(analysesMap);
      }
    };

    if (meetingId) {
      fetchEmotionalAnalyses();
    }

    // Subscribe to real-time updates
    const channel = supabase
      .channel('emotional-analysis')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emotional_analysis',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          const newAnalysis = payload.new as any;
          const formattedAnalysis: EmotionalAnalysis = {
            ...newAnalysis,
            secondary_emotions: Array.isArray(newAnalysis.secondary_emotions) 
              ? newAnalysis.secondary_emotions 
              : []
          };
          setEmotionalAnalyses(prev => new Map(prev.set(formattedAnalysis.transcription_id, formattedAnalysis)));
          setAnalyzingIds(prev => {
            const next = new Set(prev);
            next.delete(formattedAnalysis.transcription_id);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  // Auto-analyze new transcriptions
  useEffect(() => {
    const analyzeNewTranscriptions = async () => {
      for (const transcript of transcriptions) {
        if (!emotionalAnalyses.has(transcript.id) && !analyzingIds.has(transcript.id)) {
          setAnalyzingIds(prev => new Set(prev.add(transcript.id)));
          
          try {
            const { error } = await supabase.functions.invoke('analyze-emotional-tone', {
              body: {
                transcriptionId: transcript.id,
                meetingId: meetingId,
                content: transcript.content,
                speakerName: transcript.speaker_name,
              }
            });

            if (error) {
              console.error('Failed to analyze emotional tone:', error);
              setAnalyzingIds(prev => {
                const next = new Set(prev);
                next.delete(transcript.id);
                return next;
              });
            }
          } catch (error) {
            console.error('Error analyzing emotional tone:', error);
            setAnalyzingIds(prev => {
              const next = new Set(prev);
              next.delete(transcript.id);
              return next;
            });
          }
        }
      }
    };

    if (transcriptions.length > 0 && isRecording) {
      analyzeNewTranscriptions();
    }
  }, [transcriptions, emotionalAnalyses, analyzingIds, isRecording, meetingId]);

  // Generate particles on new transcription
  useEffect(() => {
    if (transcriptions.length > 0) {
      const newParticles = Array.from({ length: 10 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: i * 0.05
      }));
      setParticles(prev => [...prev.slice(-20), ...newParticles]);
    }
  }, [transcriptions.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && isRecording) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions, isRecording]);

  // Filter transcriptions
  const filteredTranscriptions = useMemo(() => {
    return transcriptions.filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpeaker = selectedSpeaker === null || 
        (t.speaker_name || 'Unknown') === selectedSpeaker;
      return matchesSearch && matchesSpeaker;
    });
  }, [transcriptions, searchQuery, selectedSpeaker]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleHighlight = (transcriptionId: string, content: string) => {
    setHighlightedIds(prev => new Set([...prev, transcriptionId]));
    onHighlight?.(transcriptionId, content);
  };

  const exportTranscription = () => {
    const text = filteredTranscriptions
      .map(t => `[${formatTime(t.timestamp)}] ${t.speaker_name || 'Unknown'}: ${t.content}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString()}.txt`;
    a.click();
  };

  const SPEAKER_COLORS = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-yellow-500 to-orange-500',
  ];

  const getSpeakerColor = (speaker: string) => {
    const index = speakers.indexOf(speaker);
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
  };

  const stats = useMemo(() => ({
    totalWords: filteredTranscriptions.reduce((sum, t) => sum + t.content.split(' ').length, 0),
    avgConfidence: filteredTranscriptions.reduce((sum, t) => sum + (t.confidence_score || 0), 0) / filteredTranscriptions.length,
    keyMoments: filteredTranscriptions.filter(t => isKeyMoment(t.content)).length,
    questions: filteredTranscriptions.filter(t => t.content.includes('?')).length,
  }), [filteredTranscriptions]);

  return (
    <Card className="relative overflow-hidden border-2 shadow-2xl">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5 animate-pulse" />
      
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <TranscriptionParticle key={p.id} x={p.x} y={p.y} delay={p.delay} />
        ))}
      </div>

      <CardHeader className="relative z-10 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <motion.div
                animate={{
                  scale: isRecording ? [1, 1.2, 1] : 1,
                  rotate: isRecording ? [0, 360] : 0,
                }}
                transition={{
                  duration: 2,
                  repeat: isRecording ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <Brain className="h-7 w-7 text-primary" />
              </motion.div>
              AI-Powered Live Transcription
            </CardTitle>
            <CardDescription className="text-sm">
              Real-time speech analysis with sentiment detection and key moment identification
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            {isRecording && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Badge variant="destructive" className="gap-2 text-sm px-4 py-2">
                  <Mic className="h-4 w-4 animate-pulse" />
                  LIVE
                </Badge>
              </motion.div>
            )}
          </div>
        </div>

        {/* Waveform Visualizer */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-lg bg-background/50 backdrop-blur-sm border overflow-hidden"
          >
            <WaveformVisualizer audioLevel={audioLevel} />
          </motion.div>
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">Words</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.totalWords}</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(stats.avgConfidence * 100)}%
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">Key Moments</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.keyMoments}</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-muted-foreground">Questions</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.questions}</p>
          </motion.div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4 pt-6">
        {/* Search and Filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcription..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-2"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={exportTranscription}
            disabled={filteredTranscriptions.length === 0}
            className="border-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Speaker Pills */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedSpeaker === null ? "default" : "outline"}
            onClick={() => setSelectedSpeaker(null)}
            className="gap-2"
          >
            <Filter className="h-3 w-3" />
            All ({transcriptions.length})
          </Button>
          {speakers.map(speaker => (
            <Button
              key={speaker}
              size="sm"
              variant={selectedSpeaker === speaker ? "default" : "outline"}
              onClick={() => setSelectedSpeaker(speaker === selectedSpeaker ? null : speaker)}
              className="gap-2"
            >
              <User className="h-3 w-3" />
              {speaker}
            </Button>
          ))}
        </div>

        {/* Transcription Stream */}
        <ScrollArea className="h-[500px] pr-4" ref={scrollRef}>
          <AnimatePresence mode="popLayout">
            {filteredTranscriptions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Volume2 className="h-20 w-20 mx-auto mb-4 text-muted-foreground/30" />
                </motion.div>
                <p className="text-muted-foreground text-lg">
                  {isRecording ? 'Listening...' : 'Start recording to see transcription magic'}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredTranscriptions.map((transcript, index) => {
                  const sentiment = getSentiment(transcript.content);
                  const isKey = isKeyMoment(transcript.content);
                  const emotionalAnalysis = emotionalAnalyses.get(transcript.id);
                  const isAnalyzing = analyzingIds.has(transcript.id);
                  
                  return (
                    <motion.div
                      key={transcript.id}
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 20,
                        delay: index * 0.02
                      }}
                      className="group"
                    >
                      <div
                        className={cn(
                          "relative p-4 rounded-xl border-2 backdrop-blur-sm transition-all duration-300",
                          "hover:shadow-xl hover:scale-[1.02]",
                          emotionalAnalysis 
                            ? `bg-gradient-to-r ${getEmotionConfig(emotionalAnalysis.primary_emotion).bgGradient}`
                            : `bg-gradient-to-r ${getSpeakerColor(transcript.speaker_name || 'Unknown')}/10`,
                          highlightedIds.has(transcript.id) && "ring-4 ring-yellow-500/50 shadow-2xl",
                          isKey && "border-purple-500/50 shadow-lg shadow-purple-500/20"
                        )}
                      >
                        {/* Emotional Pulse Effect */}
                        {emotionalAnalysis && (
                          <motion.div
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            animate={{
                              boxShadow: [
                                '0 0 0 0 rgba(59, 130, 246, 0)',
                                `0 0 0 ${emotionalAnalysis.emotion_score * 20}px rgba(59, 130, 246, 0.1)`,
                                '0 0 0 0 rgba(59, 130, 246, 0)',
                              ]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        )}

                        {/* Decorative Corner */}
                        {isKey && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-2 -right-2"
                          >
                            <Zap className="h-6 w-6 text-purple-500 filter drop-shadow-lg" />
                          </motion.div>
                        )}

                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                className={cn(
                                  "gap-1 text-xs font-semibold px-3 py-1",
                                  `bg-gradient-to-r ${getSpeakerColor(transcript.speaker_name || 'Unknown')}`
                                )}
                              >
                                <User className="h-3 w-3" />
                                {transcript.speaker_name || 'Unknown Speaker'}
                              </Badge>
                              
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(transcript.timestamp)}
                              </span>
                              
                              {transcript.confidence_score && (
                                <Badge variant="secondary" className="text-xs">
                                  <Target className="h-3 w-3 mr-1" />
                                  {Math.round(transcript.confidence_score * 100)}%
                                </Badge>
                              )}
                            </div>

                            {/* Emotional Analysis Display */}
                            <div className="flex gap-2 flex-wrap">
                              {isAnalyzing ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border bg-blue-500/10 text-blue-700 border-blue-500/20"
                                >
                                  <Brain className="h-3 w-3" />
                                  Analyzing...
                                </motion.div>
                              ) : emotionalAnalysis ? (
                                <>
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border",
                                      getEmotionConfig(emotionalAnalysis.primary_emotion).bgGradient,
                                      getEmotionConfig(emotionalAnalysis.primary_emotion).color
                                    )}
                                  >
                                    {(() => {
                                      const EmotionIcon = getEmotionConfig(emotionalAnalysis.primary_emotion).icon;
                                      return <EmotionIcon className="h-3 w-3" />;
                                    })()}
                                    {emotionalAnalysis.primary_emotion}
                                    <span className="opacity-70">
                                      {Math.round(emotionalAnalysis.emotion_score * 100)}%
                                    </span>
                                  </motion.div>
                                  
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      emotionalAnalysis.sentiment === 'positive' && "bg-green-500/10 text-green-700 border-green-500/20",
                                      emotionalAnalysis.sentiment === 'negative' && "bg-red-500/10 text-red-700 border-red-500/20",
                                      emotionalAnalysis.sentiment === 'neutral' && "bg-gray-500/10 text-gray-700 border-gray-500/20"
                                    )}
                                  >
                                    {emotionalAnalysis.sentiment}
                                  </Badge>
                                  
                                  <Badge variant="outline" className="text-xs">
                                    <Activity className="h-3 w-3 mr-1" />
                                    {emotionalAnalysis.energy_level} energy
                                  </Badge>
                                </>
                              ) : (
                                <AIInsight 
                                  text={sentiment.type} 
                                  icon={sentiment.icon} 
                                  color={sentiment.color}
                                />
                              )}
                              
                              {isKey && (
                                <AIInsight 
                                  text="Key Moment" 
                                  icon={Award} 
                                  color="bg-purple-500/10 text-purple-700 border-purple-500/20"
                                />
                              )}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleHighlight(transcript.id, transcript.content)}
                          >
                            <Star className={cn(
                              "h-4 w-4",
                              highlightedIds.has(transcript.id) && "fill-yellow-500 text-yellow-500"
                            )} />
                          </Button>
                        </div>

                        {/* Content with word highlighting */}
                        <motion.p 
                          className="text-sm leading-relaxed"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          {transcript.content.split(' ').map((word, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="inline-block mr-1"
                            >
                              {word}
                            </motion.span>
                          ))}
                        </motion.p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
