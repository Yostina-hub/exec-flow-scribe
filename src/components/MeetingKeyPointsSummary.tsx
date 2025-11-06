import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lightbulb, CheckCircle, ListChecks, Tag, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KeyPointsData {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  keywords: string[];
}

interface MeetingKeyPointsSummaryProps {
  meetingId: string;
}

export const MeetingKeyPointsSummary = ({ meetingId }: MeetingKeyPointsSummaryProps) => {
  const [keyPoints, setKeyPoints] = useState<KeyPointsData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadExistingKeyPoints();
  }, [meetingId]);

  const loadExistingKeyPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_summaries')
        .select('content')
        .eq('meeting_id', meetingId)
        .eq('summary_type', 'key_points')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.content) {
        setKeyPoints(JSON.parse(data.content as string));
      }
    } catch (error) {
      console.error('Error loading key points:', error);
    }
  };

  const generateKeyPoints = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-key-points', {
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

      setKeyPoints(data.keyPoints);
      toast({
        title: 'Key Points Generated',
        description: 'AI has extracted the main points from your meeting',
      });
    } catch (error: any) {
      console.error('Error generating key points:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate key points',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!keyPoints) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Key Points Summary
          </CardTitle>
          <CardDescription>
            Generate an intelligent summary of the main points, decisions, and action items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateKeyPoints} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Meeting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Key Points
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Key Points Summary
            </CardTitle>
            <CardDescription className="mt-2">
              {keyPoints.summary}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={generateKeyPoints} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Points */}
        {keyPoints.keyPoints.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-primary" />
              Main Discussion Points
            </h3>
            <ul className="space-y-2">
              {keyPoints.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisions */}
        {keyPoints.decisions.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Key Decisions
            </h3>
            <ul className="space-y-2">
              {keyPoints.decisions.map((decision, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {keyPoints.actionItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-orange-500" />
              Action Items
            </h3>
            <ul className="space-y-2">
              {keyPoints.actionItems.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <ListChecks className="mt-0.5 h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Keywords */}
        {keyPoints.keywords.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4 text-primary" />
              Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {keyPoints.keywords.map((keyword, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
