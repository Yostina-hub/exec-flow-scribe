import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface TranscriptSegment {
  id: string;
  content: string;
  timestamp: string;
  startTime: number;
  endTime: number;
}

interface FactCheckPanelProps {
  meetingId: string;
  transcript: TranscriptSegment[];
}

interface FactCheckResult {
  contradictions?: string[];
  missing_context?: string[];
  related_decisions?: string[];
}

interface FactCheck {
  id: string;
  transcript_segment: string;
  check_result: FactCheckResult | any;
  status: string;
  created_at: string;
}

export function FactCheckPanel({ meetingId, transcript }: FactCheckPanelProps) {
  const [factChecks, setFactChecks] = useState<FactCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFactChecks();
  }, [meetingId]);

  const fetchFactChecks = async () => {
    try {
      const { data, error } = await supabase
        .from('fact_checks')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFactChecks((data || []) as FactCheck[]);
    } catch (error) {
      console.error('Error fetching fact checks:', error);
    }
  };

  const runFactCheck = async () => {
    try {
      setIsChecking(true);
      
      // TODO: Call AI service to perform fact checking
      // For now, create a mock fact check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Mock fact check result
      const mockFactCheck = {
        meeting_id: meetingId,
        transcript_segment: transcript[0]?.content || 'Sample segment',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        check_result: {
          contradictions: ['This statement contradicts decision #123'],
          missing_context: ['Requires reference to Q4 budget'],
          related_decisions: ['Decision ID: abc-123', 'Action Item: xyz-456'],
        },
        status: 'pending',
      };

      const { error } = await supabase
        .from('fact_checks')
        .insert(mockFactCheck);

      if (error) throw error;

      await fetchFactChecks();

      toast({
        title: 'Fact Check Complete',
        description: 'Found potential issues to review',
      });
    } catch (error) {
      console.error('Error running fact check:', error);
      toast({
        title: 'Error',
        description: 'Failed to run fact check',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const updateFactCheckStatus = async (id: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('fact_checks')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await fetchFactChecks();

      toast({
        title: 'Updated',
        description: `Fact check marked as ${status}`,
      });
    } catch (error) {
      console.error('Error updating fact check:', error);
      toast({
        title: 'Error',
        description: 'Failed to update fact check',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'reviewed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Fact Checks</h3>
          <Button size="sm" onClick={runFactCheck} disabled={isChecking}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Run Fact Check'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {factChecks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fact checks yet. Click "Run Fact Check" to analyze the transcript.
            </div>
          ) : (
            factChecks.map((check) => (
              <Card key={check.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <Badge variant="outline">{check.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(check.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm bg-muted p-3 rounded">
                    <span className="font-medium">Segment: </span>
                    {check.transcript_segment}
                  </div>

                  {check.check_result.contradictions && check.check_result.contradictions.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                        <XCircle className="w-4 h-4" />
                        Contradictions
                      </div>
                      {check.check_result.contradictions.map((item, idx) => (
                        <div key={idx} className="text-xs pl-6">
                          • {item}
                        </div>
                      ))}
                    </div>
                  )}

                  {check.check_result.missing_context && check.check_result.missing_context.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                        Missing Context
                      </div>
                      {check.check_result.missing_context.map((item, idx) => (
                        <div key={idx} className="text-xs pl-6">
                          • {item}
                        </div>
                      ))}
                    </div>
                  )}

                  {check.check_result.related_decisions && check.check_result.related_decisions.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold">Related Decisions</div>
                      {check.check_result.related_decisions.map((item, idx) => (
                        <div key={idx} className="text-xs pl-6 text-muted-foreground">
                          • {item}
                        </div>
                      ))}
                    </div>
                  )}

                  {check.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFactCheckStatus(check.id, 'reviewed')}
                      >
                        Mark Reviewed
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateFactCheckStatus(check.id, 'resolved')}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
