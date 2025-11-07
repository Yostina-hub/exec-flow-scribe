import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart, Pie, Cell, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Activity, Users, 
  Heart, Brain, Zap, Award, BarChart3, PieChartIcon,
  Smile, Frown, Meh
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface EmotionalAnalysis {
  id: string;
  transcription_id: string;
  meeting_id: string;
  speaker_name: string;
  primary_emotion: string;
  emotion_score: number;
  secondary_emotions: string[];
  sentiment: string;
  energy_level: string;
  confidence: number;
  analyzed_at: string;
}

interface EmotionalAnalyticsDashboardProps {
  meetingId: string;
}

const EMOTION_COLORS: Record<string, string> = {
  joy: '#F59E0B',
  happiness: '#F59E0B',
  excitement: '#EF4444',
  sadness: '#3B82F6',
  anger: '#DC2626',
  frustration: '#F97316',
  fear: '#8B5CF6',
  anxiety: '#A855F7',
  surprise: '#06B6D4',
  confidence: '#10B981',
  uncertainty: '#6B7280',
  neutral: '#9CA3AF',
};

const SENTIMENT_COLORS = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280',
};

const ENERGY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#3B82F6',
};

export const EmotionalAnalyticsDashboard = ({ meetingId }: EmotionalAnalyticsDashboardProps) => {
  const [analyses, setAnalyses] = useState<EmotionalAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyses = async () => {
      const { data, error } = await supabase
        .from('emotional_analysis')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('analyzed_at', { ascending: true });

      if (!error && data) {
        setAnalyses(data.map(a => ({
          ...a,
          secondary_emotions: Array.isArray(a.secondary_emotions) 
            ? (a.secondary_emotions as any[]).map(e => String(e))
            : []
        } as EmotionalAnalysis)));
      }
      setLoading(false);
    };

    fetchAnalyses();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('emotional-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emotional_analysis',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchAnalyses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  // Get unique speakers
  const speakers = useMemo(() => {
    return [...new Set(analyses.map(a => a.speaker_name || 'Unknown'))];
  }, [analyses]);

  // Timeline data for emotional journey
  const timelineData = useMemo(() => {
    return analyses.map((a, index) => ({
      index: index + 1,
      time: new Date(a.analyzed_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      speaker: a.speaker_name || 'Unknown',
      emotion: a.primary_emotion,
      score: a.emotion_score * 100,
      sentiment: a.sentiment,
      energy: a.energy_level,
      fullData: a,
    }));
  }, [analyses]);

  // Speaker-specific data
  const speakerData = useMemo(() => {
    return speakers.map(speaker => {
      const speakerAnalyses = analyses.filter(a => (a.speaker_name || 'Unknown') === speaker);
      const emotionCounts = speakerAnalyses.reduce((acc, a) => {
        acc[a.primary_emotion] = (acc[a.primary_emotion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sentimentCounts = speakerAnalyses.reduce((acc, a) => {
        acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const avgScore = speakerAnalyses.reduce((sum, a) => sum + a.emotion_score, 0) / speakerAnalyses.length;

      return {
        speaker,
        analyses: speakerAnalyses,
        emotionCounts,
        sentimentCounts,
        avgScore,
        totalAnalyses: speakerAnalyses.length,
      };
    });
  }, [speakers, analyses]);

  // Emotion distribution
  const emotionDistribution = useMemo(() => {
    const counts = analyses.reduce((acc, a) => {
      acc[a.primary_emotion] = (acc[a.primary_emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([emotion, count]) => ({
      name: emotion,
      value: count,
      color: EMOTION_COLORS[emotion] || '#9CA3AF',
    }));
  }, [analyses]);

  // Sentiment over time
  const sentimentTimeline = useMemo(() => {
    const grouped = analyses.reduce((acc, a, idx) => {
      const timeSlot = Math.floor(idx / 5); // Group every 5 analyses
      if (!acc[timeSlot]) {
        acc[timeSlot] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      }
      acc[timeSlot][a.sentiment as 'positive' | 'negative' | 'neutral']++;
      acc[timeSlot].total++;
      return acc;
    }, {} as Record<number, any>);

    return Object.entries(grouped).map(([slot, data]) => ({
      slot: `T${parseInt(slot) + 1}`,
      positive: Math.round((data.positive / data.total) * 100),
      negative: Math.round((data.negative / data.total) * 100),
      neutral: Math.round((data.neutral / data.total) * 100),
    }));
  }, [analyses]);

  // Energy levels over time
  const energyTimeline = useMemo(() => {
    return analyses.map((a, idx) => ({
      index: idx + 1,
      time: new Date(a.analyzed_at).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      energy: a.energy_level === 'high' ? 3 : a.energy_level === 'medium' ? 2 : 1,
      speaker: a.speaker_name || 'Unknown',
    }));
  }, [analyses]);

  // Overall statistics
  const stats = useMemo(() => {
    const positive = analyses.filter(a => a.sentiment === 'positive').length;
    const negative = analyses.filter(a => a.sentiment === 'negative').length;
    const neutral = analyses.filter(a => a.sentiment === 'neutral').length;
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;

    return {
      totalAnalyses: analyses.length,
      positive,
      negative,
      neutral,
      avgConfidence: Math.round(avgConfidence * 100),
      dominantEmotion: emotionDistribution[0]?.name || 'neutral',
    };
  }, [analyses, emotionDistribution]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No emotional analysis data available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Analyses</p>
                  <p className="text-2xl font-bold">{stats.totalAnalyses}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Positive</p>
                  <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
                </div>
                <Smile className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Negative</p>
                  <p className="text-2xl font-bold text-red-600">{stats.negative}</p>
                </div>
                <Frown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-2 border-gray-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Neutral</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.neutral}</p>
                </div>
                <Meh className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-2 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgConfidence}%</p>
                </div>
                <Award className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="emotions">Emotions</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="energy">Energy</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emotional Journey Timeline</CardTitle>
              <CardDescription>
                Track emotional changes throughout the meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: 'Emotion Score (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.speaker}</p>
                            <p className="text-sm text-muted-foreground">{data.time}</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                <span className="font-medium">Emotion:</span> {data.emotion}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Score:</span> {data.score.toFixed(0)}%
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Sentiment:</span>{' '}
                                <Badge variant="outline" className="text-xs">
                                  {data.sentiment}
                                </Badge>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {speakers.map((speaker, idx) => (
                    <Line
                      key={speaker}
                      type="monotone"
                      dataKey="score"
                      data={timelineData.filter(d => d.speaker === speaker)}
                      stroke={EMOTION_COLORS[Object.keys(EMOTION_COLORS)[idx % Object.keys(EMOTION_COLORS).length]]}
                      name={speaker}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Speakers View */}
        <TabsContent value="speakers" className="space-y-4">
          <div className="grid gap-4">
            {speakerData.map((speaker, idx) => (
              <motion.div
                key={speaker.speaker}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {speaker.speaker}
                      </CardTitle>
                      <Badge variant="secondary">
                        {speaker.totalAnalyses} analyses
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Emotion Distribution */}
                      <div>
                        <h4 className="text-sm font-medium mb-4">Emotion Distribution</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={Object.entries(speaker.emotionCounts).map(([emotion, count]) => ({
                                name: emotion,
                                value: count,
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {Object.keys(speaker.emotionCounts).map((emotion, index) => (
                                <Cell key={`cell-${index}`} fill={EMOTION_COLORS[emotion] || '#9CA3AF'} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Sentiment Breakdown */}
                      <div>
                        <h4 className="text-sm font-medium mb-4">Sentiment Breakdown</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={Object.entries(speaker.sentimentCounts).map(([sentiment, count]) => ({
                              sentiment,
                              count,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="sentiment" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8">
                              {Object.keys(speaker.sentimentCounts).map((sentiment, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS]} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Emotions View */}
        <TabsContent value="emotions">
          <Card>
            <CardHeader>
              <CardTitle>Overall Emotion Distribution</CardTitle>
              <CardDescription>
                Breakdown of all emotions detected in the meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={emotionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {emotionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={emotionDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {emotionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment View */}
        <TabsContent value="sentiment">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Trends Over Time</CardTitle>
              <CardDescription>
                How sentiment evolved throughout the meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={sentimentTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="slot" />
                  <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="positive"
                    stackId="1"
                    stroke={SENTIMENT_COLORS.positive}
                    fill={SENTIMENT_COLORS.positive}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    stackId="1"
                    stroke={SENTIMENT_COLORS.neutral}
                    fill={SENTIMENT_COLORS.neutral}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="negative"
                    stackId="1"
                    stroke={SENTIMENT_COLORS.negative}
                    fill={SENTIMENT_COLORS.negative}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Energy View */}
        <TabsContent value="energy">
          <Card>
            <CardHeader>
              <CardTitle>Energy Levels Over Time</CardTitle>
              <CardDescription>
                Track the energy dynamics throughout the meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={energyTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis 
                    domain={[0, 4]} 
                    ticks={[1, 2, 3]}
                    tickFormatter={(value) => ['Low', 'Medium', 'High'][value - 1] || ''}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const energyLevel = ['Low', 'Medium', 'High'][data.energy - 1];
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.speaker}</p>
                            <p className="text-sm text-muted-foreground">{data.time}</p>
                            <p className="text-sm mt-1">
                              <span className="font-medium">Energy:</span> {energyLevel}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {speakers.map((speaker, idx) => (
                    <Line
                      key={speaker}
                      type="step"
                      dataKey="energy"
                      data={energyTimeline.filter(d => d.speaker === speaker)}
                      stroke={EMOTION_COLORS[Object.keys(EMOTION_COLORS)[idx % Object.keys(EMOTION_COLORS).length]]}
                      name={speaker}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
