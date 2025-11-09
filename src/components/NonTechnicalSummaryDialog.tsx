import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Download, Copy, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

interface NonTechnicalSummaryDialogProps {
  content: string;
  language: 'am' | 'en' | 'or';
  meetingTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NonTechnicalSummaryDialog = ({
  content,
  language,
  meetingTitle,
  open,
  onOpenChange,
}: NonTechnicalSummaryDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-non-technical-summary', {
        body: { content, language },
      });

      if (error) throw error;
      
      if (data?.summary) {
        setSummary(data.summary);
        toast({
          title: 'Summary Generated',
          description: 'Non-technical summary created successfully',
        });
      }
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: 'Copied',
        description: 'Summary copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // Title
      doc.setFontSize(16);
      doc.text('Non-Technical Summary', margin, 20);
      doc.setFontSize(12);
      doc.text(meetingTitle, margin, 30);
      
      // Content
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(summary, maxWidth);
      doc.text(lines, margin, 40);
      
      doc.save(`non-technical-summary-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: 'Downloaded',
        description: 'PDF saved successfully',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Non-Technical Summary
          </DialogTitle>
          <DialogDescription>
            Easy-to-understand summary without technical jargon
          </DialogDescription>
        </DialogHeader>

        {!summary && !isGenerating && (
          <div className="py-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">
              Generate a simplified, non-technical explanation of the meeting
            </p>
            <Button onClick={handleGenerate} size="lg" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Generate Non-Technical Summary
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="py-12 text-center">
            <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">
              Creating easy-to-understand summary...
            </p>
          </div>
        )}

        {summary && !isGenerating && (
          <>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button size="sm" onClick={handleGenerate} className="gap-2">
                <FileText className="h-4 w-4" />
                Regenerate
              </Button>
            </div>

            <ScrollArea className="h-[450px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
