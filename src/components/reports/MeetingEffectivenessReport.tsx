import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Clock, 
  Users, 
  CheckSquare, 
  TrendingUp,
  Calendar,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MeetingEffectiveness {
  meeting_id: string;
  attendance_rate: number;
  on_time_start: boolean;
  duration_vs_planned: number;
  agenda_completion_rate: number;
  action_items_created: number;
  action_items_completed: number;
  participant_engagement_score: number;
  outcome_clarity_score: number;
  follow_up_rate: number;
  calculated_at: string;
}

interface MeetingEffectivenessReportProps {
  meetingId: string;
}

export function MeetingEffectivenessReport({ meetingId }: MeetingEffectivenessReportProps) {
  const { toast } = useToast();
  const [effectiveness, setEffectiveness] = useState<MeetingEffectiveness | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchEffectiveness();
  }, [meetingId]);

  const fetchEffectiveness = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_effectiveness" as any)
        .select("*")
        .eq("meeting_id", meetingId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setEffectiveness((data as any) || null);
    } catch (error) {
      console.error("Error fetching effectiveness:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEffectiveness = async () => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.rpc("calculate_meeting_effectiveness" as any, {
        _meeting_id: meetingId,
      });

      if (error) throw error;

      toast({
        title: "Effectiveness calculated",
        description: "Meeting effectiveness metrics have been updated",
      });

      fetchEffectiveness();
    } catch (error: any) {
      console.error("Error calculating effectiveness:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getOverallScore = () => {
    if (!effectiveness) return 0;
    
    const scores = [
      effectiveness.attendance_rate || 0,
      effectiveness.on_time_start ? 100 : 0,
      effectiveness.agenda_completion_rate || 0,
      effectiveness.follow_up_rate || 0,
      (effectiveness.participant_engagement_score || 0) * 10,
      (effectiveness.outcome_clarity_score || 0) * 10,
    ];

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Award className="h-8 w-8 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading effectiveness metrics...</p>
        </CardContent>
      </Card>
    );
  }

  const overallScore = getOverallScore();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Meeting Effectiveness
            </CardTitle>
            <CardDescription>
              Comprehensive performance metrics for this meeting
            </CardDescription>
          </div>
          <Button
            onClick={calculateEffectiveness}
            disabled={calculating}
            variant="outline"
            size="sm"
          >
            {calculating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!effectiveness ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No effectiveness data available yet
            </p>
            <Button onClick={calculateEffectiveness} disabled={calculating}>
              Calculate Metrics
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center pb-4 border-b">
              <div className="text-4xl font-bold mb-2">
                <span className={getScoreColor(overallScore)}>
                  {overallScore.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Overall Effectiveness Score</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Attendance Rate</span>
                  </div>
                  <span className={`font-bold ${getScoreColor(effectiveness.attendance_rate || 0)}`}>
                    {(effectiveness.attendance_rate || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress value={effectiveness.attendance_rate || 0} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">On-Time Start</span>
                  </div>
                  <Badge variant={effectiveness.on_time_start ? "default" : "destructive"}>
                    {effectiveness.on_time_start ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Agenda Completion</span>
                  </div>
                  <span className={`font-bold ${getScoreColor(effectiveness.agenda_completion_rate || 0)}`}>
                    {(effectiveness.agenda_completion_rate || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress value={effectiveness.agenda_completion_rate || 0} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Follow-Up Rate</span>
                  </div>
                  <span className={`font-bold ${getScoreColor(effectiveness.follow_up_rate || 0)}`}>
                    {(effectiveness.follow_up_rate || 0).toFixed(1)}%
                  </span>
                </div>
                <Progress value={effectiveness.follow_up_rate || 0} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Participant Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {effectiveness.participant_engagement_score?.toFixed(1) || '0'}/10
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Outcome Clarity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {effectiveness.outcome_clarity_score?.toFixed(1) || '0'}/10
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Action Items Created</p>
                <p className="text-2xl font-bold">{effectiveness.action_items_created}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Action Items Completed</p>
                <p className="text-2xl font-bold text-green-500">
                  {effectiveness.action_items_completed}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
