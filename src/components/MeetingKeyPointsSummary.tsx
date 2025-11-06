import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Lightbulb, CheckCircle, ListChecks, Tag, Loader2, Download, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [open, setOpen] = useState(false);
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
        body: { meetingId, language }
      });

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      if (data.error) {
        // Handle specific error types
        if (data.error.includes('temporarily unavailable')) {
          toast({
            title: 'Service Temporarily Unavailable',
            description: 'The AI service is currently unavailable. Please try again in a few moments.',
            variant: 'destructive',
          });
        } else if (data.error.includes('Rate limit')) {
          toast({
            title: 'Rate Limit Reached',
            description: 'Please wait a moment before trying again.',
            variant: 'destructive',
          });
        } else if (data.error.includes('Credits')) {
          toast({
            title: 'Credits Required',
            description: 'Please add funds to your workspace to continue using AI features.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: data.error,
            variant: 'destructive',
          });
        }
        return;
      }

      setKeyPoints(data.keyPoints);
      setOpen(true);
      toast({
        title: 'Key Points Generated',
        description: 'AI has extracted the main points from your meeting',
      });
    } catch (error: any) {
      console.error('Error generating key points:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate key points. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!keyPoints) return;
    
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-key-points-pdf', {
        body: { 
          meetingId,
          keyPoints,
          language
        }
      });

      if (error) throw error;

      if (data.pdfBase64) {
        const blob = new Uint8Array(atob(data.pdfBase64).split('').map(c => c.charCodeAt(0)));
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `key-points-${language}-${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: 'PDF Downloaded',
          description: 'Key points PDF has been downloaded successfully',
        });
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Key Points Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Key Points Summary
          </DialogTitle>
          <DialogDescription>
            AI-generated summary of main points, decisions, and action items
          </DialogDescription>
        </DialogHeader>

        {!keyPoints ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-4">
              <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'am')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      English
                    </div>
                  </SelectItem>
                  <SelectItem value="am">
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      አማርኛ (Amharic)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={generateKeyPoints} disabled={isGenerating} className="gap-2 flex-1">
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
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Select language and generate an intelligent summary
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'am')}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={generateKeyPoints} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPDF} disabled={isDownloading} className="gap-2 ml-auto">
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">{keyPoints.summary}</p>
                </div>

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
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
