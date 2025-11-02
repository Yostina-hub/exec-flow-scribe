import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  timestamp?: string;
}

export function SystemTestPanel({ meetingId }: { meetingId: string }) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const updateResult = (step: string, status: TestResult['status'], message: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step 
          ? { ...r, status, message, timestamp: new Date().toISOString() }
          : r
        );
      }
      return [...prev, { step, status, message, timestamp: new Date().toISOString() }];
    });
  };

  const runCompleteTest = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Test 1: Check meeting exists
      updateResult('meeting', 'running', 'Checking meeting details...');
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingError || !meeting) {
        updateResult('meeting', 'error', 'Meeting not found');
        return;
      }
      updateResult('meeting', 'success', `Meeting: ${meeting.title}`);

      // Test 2: Check transcriptions
      updateResult('transcription', 'running', 'Checking transcriptions...');
      const { data: transcripts, error: transError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meetingId);

      if (transError) {
        updateResult('transcription', 'error', `Error: ${transError.message}`);
      } else {
        updateResult('transcription', 'success', `Found ${transcripts?.length || 0} transcription segments`);
      }

      // Test 3: Generate minutes
      updateResult('minutes', 'running', 'Generating AI minutes...');
      const { data: minutesData, error: minutesError } = await supabase.functions.invoke('generate-minutes', {
        body: { meetingId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (minutesError || minutesData?.error) {
        updateResult('minutes', 'error', minutesError?.message || minutesData?.error || 'Failed');
      } else {
        updateResult('minutes', 'success', 'Minutes generated successfully');

        // Test 4: Generate PDF
        updateResult('pdf', 'running', 'Generating PDF document...');
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
          body: { meetingId },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (pdfError || pdfData?.error) {
          updateResult('pdf', 'error', pdfError?.message || pdfData?.error || 'Failed');
        } else {
          updateResult('pdf', 'success', `PDF generated: ${pdfData.pdf_url?.substring(0, 50)}...`);

          // Test 5: Check signature system
          updateResult('signatures', 'running', 'Checking signature system...');
          const { data: sigData, error: sigError } = await supabase
            .from('signature_requests')
            .select('*')
            .eq('meeting_id', meetingId);

          if (sigError) {
            updateResult('signatures', 'error', `Error: ${sigError.message}`);
          } else {
            updateResult('signatures', 'success', `${sigData?.length || 0} signature requests found`);
          }

          // Test 6: Check email distribution capability
          updateResult('email', 'running', 'Checking email configuration...');
          const { data: { user } } = await supabase.auth.getUser();
          const { data: smtp } = await supabase
            .from('smtp_settings')
            .select('*')
            .eq('user_id', user?.id)
            .eq('is_active', true)
            .maybeSingle();

          if (!smtp) {
            updateResult('email', 'error', 'SMTP not configured. Go to Settings > Email to configure.');
          } else {
            updateResult('email', 'success', `SMTP configured: ${smtp.host}`);
          }
        }
      }

      toast({
        title: 'Test Complete',
        description: 'System workflow test finished',
      });
    } catch (error: any) {
      console.error('Test error:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'destructive';
      case 'running': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>🧪 System Test Panel</CardTitle>
            <CardDescription>
              Test complete end-to-end workflow for Ethiopian Telecom demo
            </CardDescription>
          </div>
          <Button
            onClick={runCompleteTest}
            disabled={isRunning}
            size="lg"
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Full Test
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Click "Run Full Test" to test the complete workflow</p>
            <p className="text-xs mt-2">
              Tests: Meeting → Transcription → Minutes → PDF → Signatures → Email
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm capitalize">{result.step}</p>
                      <Badge variant={getStatusBadge(result.status) as any} className="text-xs">
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground break-words">{result.message}</p>
                    {result.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {results.length > 0 && !isRunning && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Results: {results.filter(r => r.status === 'success').length} passed, {' '}
                  {results.filter(r => r.status === 'error').length} failed
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={runCompleteTest}>
                Run Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}