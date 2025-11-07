import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, TrendingUp, TrendingDown, Activity, Brain,
  Heart, Zap, Target, BarChart3, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SpeakerProfile {
  id: string;
  user_id: string;
  meeting_count: number;
  dominant_emotion: string;
  average_sentiment: number;
  average_energy: number;
  emotional_stability: number;
  emotion_distribution: Record<string, number>;
  sentiment_trend: Array<{
    meeting_id: string;
    sentiment: number;
    date: string;
  }>;
  last_analyzed_meeting_id: string;
  updated_at: string;
}

interface ProfileWithUser extends SpeakerProfile {
  user_name: string;
  user_email: string;
}

interface SpeakerEmotionalProfilesProps {
  meetingId: string;
}

const EMOTION_COLORS: Record<string, string> = {
  joy: 'hsl(var(--chart-1))',
  happiness: 'hsl(var(--chart-1))',
  excitement: 'hsl(var(--chart-2))',
  sadness: 'hsl(var(--chart-3))',
  anger: 'hsl(var(--chart-4))',
  frustration: 'hsl(var(--chart-5))',
  fear: 'hsl(var(--chart-1))',
  anxiety: 'hsl(var(--chart-2))',
  surprise: 'hsl(var(--chart-3))',
  confidence: 'hsl(var(--chart-4))',
  uncertainty: 'hsl(var(--muted-foreground))',
  neutral: 'hsl(var(--muted-foreground))',
};

const getSentimentColor = (sentiment: number): string => {
  if (sentiment > 0.3) return 'text-green-600';
  if (sentiment < -0.3) return 'text-red-600';
  return 'text-muted-foreground';
};

const getSentimentLabel = (sentiment: number): string => {
  if (sentiment > 0.3) return 'Positive';
  if (sentiment < -0.3) return 'Negative';
  return 'Neutral';
};

export const SpeakerEmotionalProfiles = ({ meetingId }: SpeakerEmotionalProfilesProps) => {
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('speaker-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'speaker_emotional_profiles',
        },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchProfiles = async () => {
    try {
      // Get meeting attendees
      const { data: attendees, error: attendeesError } = await supabase
        .from('meeting_attendees')
        .select('user_id')
        .eq('meeting_id', meetingId);

      if (attendeesError) throw attendeesError;

      if (!attendees || attendees.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const userIds = attendees.map(a => a.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('speaker_emotional_profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Fetch user details
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Combine data
      const enrichedProfiles: ProfileWithUser[] = (profilesData || []).map(profile => {
        const user = usersData?.find(u => u.id === profile.user_id);
        return {
          ...profile,
          emotion_distribution: (profile.emotion_distribution as Record<string, number>) || {},
          sentiment_trend: (profile.sentiment_trend as Array<{
            meeting_id: string;
            sentiment: number;
            date: string;
          }>) || [],
          user_name: user?.full_name || 'Unknown',
          user_email: user?.email || '',
        };
      });

      setProfiles(enrichedProfiles);
      if (enrichedProfiles.length > 0 && !selectedProfile) {
        setSelectedProfile(enrichedProfiles[0]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch speaker profiles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userId: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase.functions.invoke('update-speaker-profiles', {
        body: { userId, meetingId },
      });

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Speaker emotional profile has been recalculated',
      });

      await fetchProfiles();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update speaker profile',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

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

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              No speaker profiles available yet. Profiles are generated after emotional analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const emotionRadarData = selectedProfile
    ? Object.entries(selectedProfile.emotion_distribution).map(([emotion, count]) => ({
        emotion,
        value: count,
        fullMark: Math.max(...Object.values(selectedProfile.emotion_distribution)),
      }))
    : [];

  const sentimentTrendData = selectedProfile?.sentiment_trend
    .slice(-10) // Last 10 meetings
    .map((trend, idx) => ({
      meeting: `M${idx + 1}`,
      sentiment: (trend.sentiment * 100).toFixed(0),
      date: new Date(trend.date).toLocaleDateString(),
      rawSentiment: trend.sentiment,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Speaker Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Speaker Profiles
          </CardTitle>
          <CardDescription>
            Historical emotional patterns across {profiles[0]?.meeting_count || 0} meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {profiles.map((profile) => (
                <motion.div
                  key={profile.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      'cursor-pointer transition-all border-2',
                      selectedProfile?.id === profile.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{profile.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {profile.meeting_count} meetings
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: EMOTION_COLORS[profile.dominant_emotion] || 'currentColor',
                          }}
                        >
                          {profile.dominant_emotion}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Profile Details */}
      <AnimatePresence mode="wait">
        {selectedProfile && (
          <motion.div
            key={selectedProfile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Profile Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sentiment</p>
                      <p className={cn('text-2xl font-bold', getSentimentColor(selectedProfile.average_sentiment))}>
                        {getSentimentLabel(selectedProfile.average_sentiment)}
                      </p>
                    </div>
                    <Heart className={cn('h-8 w-8', getSentimentColor(selectedProfile.average_sentiment))} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Energy</p>
                      <p className="text-2xl font-bold">
                        {Math.round(selectedProfile.average_energy * 100)}%
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Stability</p>
                      <p className="text-2xl font-bold">
                        {Math.round(selectedProfile.emotional_stability * 100)}%
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Meetings</p>
                      <p className="text-2xl font-bold">{selectedProfile.meeting_count}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Tabs */}
            <Tabs defaultValue="emotions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="emotions">Emotion Patterns</TabsTrigger>
                <TabsTrigger value="trends">Historical Trends</TabsTrigger>
                <TabsTrigger value="comparison">Comparisons</TabsTrigger>
              </TabsList>

              {/* Emotion Patterns */}
              <TabsContent value="emotions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Emotion Distribution</CardTitle>
                        <CardDescription>
                          Primary emotions across all meetings
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateProfile(selectedProfile.user_id)}
                        disabled={updating === selectedProfile.user_id}
                      >
                        {updating === selectedProfile.user_id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Radar Chart */}
                      <div>
                        <h4 className="text-sm font-medium mb-4 text-center">Emotion Radar</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart data={emotionRadarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis
                              dataKey="emotion"
                              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                            />
                            <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} />
                            <Radar
                              name="Frequency"
                              dataKey="value"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary))"
                              fillOpacity={0.6}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar Chart */}
                      <div>
                        <h4 className="text-sm font-medium mb-4 text-center">Emotion Frequency</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={Object.entries(selectedProfile.emotion_distribution)
                              .sort(([, a], [, b]) => b - a)
                              .map(([emotion, count]) => ({ emotion, count }))}
                            layout="horizontal"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              type="number"
                              stroke="hsl(var(--foreground))"
                            />
                            <YAxis
                              type="category"
                              dataKey="emotion"
                              stroke="hsl(var(--foreground))"
                              width={100}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                              }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Historical Trends */}
              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Trajectory</CardTitle>
                    <CardDescription>
                      How sentiment has evolved over the last 10 meetings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={sentimentTrendData}>
                        <defs>
                          <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="meeting"
                          stroke="hsl(var(--foreground))"
                        />
                        <YAxis
                          stroke="hsl(var(--foreground))"
                          label={{
                            value: 'Sentiment Score',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: 'hsl(var(--foreground))' },
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg">
                                  <p className="font-semibold">{data.meeting}</p>
                                  <p className="text-sm text-muted-foreground">{data.date}</p>
                                  <p className={cn('text-sm font-medium', getSentimentColor(data.rawSentiment))}>
                                    {getSentimentLabel(data.rawSentiment)}: {data.sentiment}%
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sentiment"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#sentimentGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Comparisons */}
              <TabsContent value="comparison" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparative Analysis</CardTitle>
                    <CardDescription>
                      How this speaker compares to other participants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={profiles.map(p => ({
                          name: p.user_name,
                          sentiment: Math.round(p.average_sentiment * 100),
                          energy: Math.round(p.average_energy * 100),
                          stability: Math.round(p.emotional_stability * 100),
                          isSelected: p.id === selectedProfile.id,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--foreground))"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis stroke="hsl(var(--foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="sentiment" fill="hsl(var(--chart-1))" name="Sentiment" />
                        <Bar dataKey="energy" fill="hsl(var(--chart-2))" name="Energy" />
                        <Bar dataKey="stability" fill="hsl(var(--chart-3))" name="Stability" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};