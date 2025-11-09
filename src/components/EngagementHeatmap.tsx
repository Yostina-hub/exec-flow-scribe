import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Users, TrendingUp, MessageSquare, Mic, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface EngagementHeatmapProps {
  meetingId: string;
}

interface ParticipantEngagement {
  id: string;
  name: string;
  speakingTime: number;
  messageCount: number;
  engagementScore: number;
  contributionType: 'high-value' | 'moderate' | 'low' | 'observer';
  lastActive: Date;
}

export function EngagementHeatmap({ meetingId }: EngagementHeatmapProps) {
  const [participants, setParticipants] = useState<ParticipantEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagementData();
    const interval = setInterval(fetchEngagementData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [meetingId]);

  const fetchEngagementData = async () => {
    try {
      // Fetch transcriptions grouped by speaker
      const { data: transcripts } = await supabase
        .from('transcriptions')
        .select('speaker_id, content, timestamp')
        .eq('meeting_id', meetingId);

      // Fetch meeting attendees with profiles
      const { data: attendees } = await supabase
        .from('meeting_attendees')
        .select(`
          user_id,
          profiles (
            full_name
          )
        `)
        .eq('meeting_id', meetingId);

      if (!transcripts || !attendees) return;

      // Calculate engagement metrics
      const engagementMap = new Map<string, ParticipantEngagement>();

      attendees.forEach((attendee) => {
        const userId = attendee.user_id;
        const userTranscripts = transcripts.filter(t => t.speaker_id === userId);
        const speakingTime = userTranscripts.length * 5; // Estimate 5 seconds per transcript
        const messageCount = userTranscripts.length;
        
        // Calculate engagement score (0-100)
        const avgMessageLength = userTranscripts.length > 0
          ? userTranscripts.reduce((sum, t) => sum + t.content.length, 0) / userTranscripts.length
          : 0;
        
        const engagementScore = Math.min(100, Math.round(
          (messageCount * 5) + (avgMessageLength / 10) + (speakingTime / 2)
        ));

        let contributionType: 'high-value' | 'moderate' | 'low' | 'observer' = 'observer';
        if (engagementScore >= 70) contributionType = 'high-value';
        else if (engagementScore >= 40) contributionType = 'moderate';
        else if (engagementScore >= 10) contributionType = 'low';

        const lastTranscript = userTranscripts[userTranscripts.length - 1];

        engagementMap.set(userId, {
          id: userId,
          name: attendee.profiles?.full_name || 'Unknown',
          speakingTime,
          messageCount,
          engagementScore,
          contributionType,
          lastActive: lastTranscript ? new Date(lastTranscript.timestamp) : new Date(0)
        });
      });

      const participantsList = Array.from(engagementMap.values())
        .sort((a, b) => b.engagementScore - a.engagementScore);

      setParticipants(participantsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
      setLoading(false);
    }
  };

  const getContributionConfig = (type: string) => {
    switch (type) {
      case 'high-value':
        return { color: 'from-success to-emerald-600', label: 'High Value', textColor: 'text-success' };
      case 'moderate':
        return { color: 'from-primary to-primary/70', label: 'Moderate', textColor: 'text-primary' };
      case 'low':
        return { color: 'from-warning to-warning/70', label: 'Low Engagement', textColor: 'text-warning' };
      default:
        return { color: 'from-muted to-muted/50', label: 'Observer', textColor: 'text-muted-foreground' };
    }
  };

  const totalSpeakingTime = participants.reduce((sum, p) => sum + p.speakingTime, 0);

  return (
    <Card className="border-l-4 border-l-primary shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Engagement Heatmap
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {participants.length} Participants
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading engagement data...
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No participant data yet
          </div>
        ) : (
          <>
            {/* Participation Balance Indicator */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-background to-muted/30 border mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Participation Balance</p>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {participants.filter(p => p.contributionType !== 'observer').length}/{participants.length} Active
                </Badge>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                {participants.map((p, i) => {
                  const width = totalSpeakingTime > 0 ? (p.speakingTime / totalSpeakingTime) * 100 : 0;
                  const config = getContributionConfig(p.contributionType);
                  return (
                    <div
                      key={p.id}
                      className={`bg-gradient-to-r ${config.color} transition-all`}
                      style={{ width: `${width}%` }}
                      title={`${p.name}: ${Math.round(width)}%`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Participant List */}
            <div className="space-y-2">
              {participants.map((participant, index) => {
                const config = getContributionConfig(participant.contributionType);
                const sharePercentage = totalSpeakingTime > 0 
                  ? Math.round((participant.speakingTime / totalSpeakingTime) * 100)
                  : 0;

                return (
                  <motion.div
                    key={participant.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {participant.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">{config.label}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold">{participant.engagementScore}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Progress value={participant.engagementScore} className="h-1.5" />
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Mic className="h-3 w-3" />
                            {Math.round(participant.speakingTime / 60)}m ({sharePercentage}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {participant.messageCount}
                          </span>
                        </div>
                        {participant.contributionType === 'high-value' && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0">
                            <Target className="h-2.5 w-2.5 mr-0.5" />
                            Key Voice
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
