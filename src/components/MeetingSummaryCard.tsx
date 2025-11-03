import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface MeetingSummaryCardProps {
  meetingId: string;
  meetingTitle: string;
}

export function MeetingSummaryCard({ meetingId, meetingTitle }: MeetingSummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSummary();
  }, [meetingId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      
      // Fetch the latest meeting minutes version
      const { data: minutes, error } = await supabase
        .from('minutes_versions')
        .select('content, created_at')
        .eq('meeting_id', meetingId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (minutes) {
        setSummary(minutes.content);
      } else {
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadSummary = async () => {
    if (!summary) return;

    try {
      setDownloading(true);

      // Create a blob from the summary content
      const blob = new Blob([summary], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meetingTitle.replace(/\s+/g, '_')}_Summary_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download complete',
        description: 'Meeting summary downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading summary:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download meeting summary',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      setDownloading(true);

      // Check if meeting has minutes URL with PDF
      const { data: meeting } = await supabase
        .from('meetings')
        .select('minutes_url')
        .eq('id', meetingId)
        .single();

      if (meeting?.minutes_url) {
        // Download the PDF from minutes_url
        window.open(meeting.minutes_url, '_blank');
      } else {
        toast({
          title: 'No PDF available',
          description: 'Generate a PDF from the Signatures tab first',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Meeting Summary</CardTitle>
          </div>
          {summary && (
            <Badge variant="secondary" className="gap-2">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </Badge>
          )}
        </div>
        <CardDescription>
          {summary 
            ? 'Your AI-generated meeting minutes and summary' 
            : 'Generate minutes to see your meeting summary'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <>
            <ScrollArea className="h-[300px] rounded-md border bg-muted/50 p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm">
                  {summary}
                </div>
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Button 
                onClick={downloadSummary} 
                className="flex-1 gap-2"
                disabled={downloading}
              >
                <Download className="h-4 w-4" />
                Download Markdown
              </Button>
              <Button 
                onClick={downloadPDF} 
                variant="outline"
                className="flex-1 gap-2"
                disabled={downloading}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No meeting summary available yet
            </p>
            <p className="text-xs text-muted-foreground">
              Generate minutes from the Actions menu after recording your meeting
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
