import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Sparkles,
  Loader2,
  Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClosingSummary {
  overallStatus: 'completed' | 'in-progress' | 'pending';
  tempo: 'on-track' | 'fast' | 'slow';
  completionRate: number;
  keyAchievements: string[];
  openItems: string[];
  nextSteps: string[];
  meetingEffectiveness: number;
  participationScore: number;
  recommendations: string[];
}

interface MeetingClosingSummaryProps {
  meetingId: string;
  meetingStatus: string;
  isActive: boolean;
}

export function MeetingClosingSummary({
  meetingId,
  meetingStatus,
  isActive,
}: MeetingClosingSummaryProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<ClosingSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (meetingStatus === 'completed' && !isActive) {
      loadExistingSummary();
    }
  }, [meetingId, meetingStatus, isActive]);

  const loadExistingSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_summaries')
        .select('content')
        .eq('meeting_id', meetingId)
        .eq('summary_type', 'closing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.content) {
        setSummary(JSON.parse(data.content as string));
      }
    } catch (error) {
      console.error('Error loading closing summary:', error);
    }
  };

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-closing-summary', {
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

      setSummary(data.summary);
      toast({
        title: 'Summary Generated',
        description: 'Meeting closing summary has been created',
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate summary',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSummary = async () => {
    if (!summary) return;

    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-closing-summary-pdf', {
        body: { meetingId, summary }
      });

      if (error) throw error;

      // Preferred path: API returns base64-encoded PDF
      if (data && (data as any).pdfBase64) {
        const bytes = Uint8Array.from(atob((data as any).pdfBase64), c => c.charCodeAt(0));
        const url = window.URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast({ title: 'PDF Downloaded', description: 'Meeting summary PDF has been downloaded' });
        return;
      }

      // Fallback: API returned plain text (current implementation)
      if (typeof data === 'string') {
        const url = window.URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast({ title: 'Summary Downloaded', description: 'Downloaded as a text file for now.' });
        return;
      }

      throw new Error('Unexpected response from download function');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download Summary',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTempoColor = (tempo: string) => {
    switch (tempo) {
      case 'on-track':
        return 'bg-green-500';
      case 'fast':
        return 'bg-blue-500';
      case 'slow':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isActive) {
    return (
      <Card className="border-2 border-purple-500/20">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Closing summary will be available after the meeting ends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Meeting Closing Summary
          </CardTitle>
          <div className="flex gap-2">
            {summary && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSummary}
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={generateSummary}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {summary ? 'Regenerate' : 'Generate Summary'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No closing summary generated yet</p>
            <p className="text-xs mt-1">Generate comprehensive meeting wrap-up</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant="secondary" className={getStatusColor(summary.overallStatus)}>
                        {summary.overallStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Completion: {summary.completionRate}%</span>
                    </div>
                    <Progress value={summary.completionRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Tempo</span>
                      <Badge className={getTempoColor(summary.tempo)}>
                        {summary.tempo}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <TrendingUp className="h-3 w-3" />
                        Effectiveness: {summary.meetingEffectiveness}%
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="h-3 w-3" />
                        Participation: {summary.participationScore}%
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Achievements */}
              {summary.keyAchievements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Key Achievements
                  </h3>
                  <ul className="space-y-2">
                    {summary.keyAchievements.map((achievement, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-900/10 p-2 rounded">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Open Items */}
              {summary.openItems.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Open Items
                  </h3>
                  <ul className="space-y-2">
                    {summary.openItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {summary.nextSteps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Next Steps
                  </h3>
                  <ul className="space-y-2">
                    {summary.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {summary.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {summary.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm bg-purple-50 dark:bg-purple-900/10 p-2 rounded">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
