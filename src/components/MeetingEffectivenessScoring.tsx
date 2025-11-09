import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Users, Target, Clock, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EffectivenessScore {
  overallScore: number;
  participationBalance: {
    score: number;
    dominantSpeakers: string[];
    underrepresented: string[];
    recommendation: string;
  };
  decisionQuality: {
    score: number;
    decisionsCount: number;
    consensusLevel: string;
    recommendation: string;
  };
  tempoAdherence: {
    score: number;
    status: 'on-time' | 'behind' | 'ahead';
    recommendation: string;
  };
  actionableRecommendations: string[];
}

interface MeetingEffectivenessScoringProps {
  meetingId: string;
}

export function MeetingEffectivenessScoring({ meetingId }: MeetingEffectivenessScoringProps) {
  const { toast } = useToast();
  const [scoring, setScoring] = useState<EffectivenessScore | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateScoring = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meeting-effectiveness', {
        body: { meetingId }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      setScoring(data.scoring);
      toast({
        title: 'Effectiveness Score Generated',
        description: `Overall meeting effectiveness: ${data.scoring.overallScore}%`,
      });
    } catch (error: any) {
      console.error('Error generating effectiveness scoring:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate effectiveness scoring',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'success' as const, label: 'Excellent' };
    if (score >= 60) return { variant: 'secondary' as const, label: 'Good' };
    return { variant: 'destructive' as const, label: 'Needs Improvement' };
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Meeting Effectiveness Scoring
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateScoring}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {scoring ? 'Refresh Score' : 'Generate Score'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!scoring ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No effectiveness score generated yet</p>
            <p className="text-xs mt-1">Analyze meeting performance and get recommendations</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="p-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Overall Effectiveness</p>
                    <div className={`text-5xl font-bold ${getScoreColor(scoring.overallScore)}`}>
                      {scoring.overallScore}%
                    </div>
                    <Badge {...getScoreBadge(scoring.overallScore)}>
                      {getScoreBadge(scoring.overallScore).label}
                    </Badge>
                    <Progress value={scoring.overallScore} className="mt-4" />
                  </div>
                </CardContent>
              </Card>

              {/* Participation Balance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4 text-blue-600" />
                      Participation Balance
                    </h3>
                    <Badge variant="secondary" className={getScoreColor(scoring.participationBalance.score)}>
                      {scoring.participationBalance.score}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={scoring.participationBalance.score} className="h-2" />
                  
                  {scoring.participationBalance.dominantSpeakers.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md">
                      <p className="text-xs font-semibold mb-1">Dominant Speakers:</p>
                      <p className="text-xs">{scoring.participationBalance.dominantSpeakers.join(', ')}</p>
                    </div>
                  )}
                  
                  {scoring.participationBalance.underrepresented.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md">
                      <p className="text-xs font-semibold mb-1">Underrepresented:</p>
                      <p className="text-xs">{scoring.participationBalance.underrepresented.join(', ')}</p>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{scoring.participationBalance.recommendation}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Decision Quality */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Target className="h-4 w-4 text-green-600" />
                      Decision Quality
                    </h3>
                    <Badge variant="secondary" className={getScoreColor(scoring.decisionQuality.score)}>
                      {scoring.decisionQuality.score}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={scoring.decisionQuality.score} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Decisions Made</p>
                      <p className="text-2xl font-bold">{scoring.decisionQuality.decisionsCount}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Consensus Level</p>
                      <p className="text-lg font-semibold">{scoring.decisionQuality.consensusLevel}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{scoring.decisionQuality.recommendation}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Tempo Adherence */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Clock className="h-4 w-4 text-purple-600" />
                      Tempo Adherence
                    </h3>
                    <Badge variant="secondary" className={getScoreColor(scoring.tempoAdherence.score)}>
                      {scoring.tempoAdherence.score}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={scoring.tempoAdherence.score} className="h-2" />
                  
                  <Badge variant={
                    scoring.tempoAdherence.status === 'on-time' ? 'success' :
                    scoring.tempoAdherence.status === 'behind' ? 'destructive' : 'secondary'
                  }>
                    {scoring.tempoAdherence.status}
                  </Badge>
                  
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{scoring.tempoAdherence.recommendation}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Actionable Recommendations */}
              <Card className="border-2 border-primary/30">
                <CardHeader>
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Actionable Recommendations
                  </h3>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {scoring.actionableRecommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm bg-primary/5 p-3 rounded-md">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-xs">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
