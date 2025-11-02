import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2, CheckCircle, Download, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PDFGenerationPanelProps {
  meetingId: string;
  hasPDF: boolean;
  pdfUrl?: string;
  minutesGenerated: boolean;
  onPDFGenerated: () => void;
}

export function PDFGenerationPanel({
  meetingId,
  hasPDF,
  pdfUrl,
  minutesGenerated,
  onPDFGenerated
}: PDFGenerationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGeneratePDF = async () => {
    if (!minutesGenerated) {
      toast({
        title: 'Minutes Required',
        description: 'Please generate meeting minutes first',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: { meetingId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'PDF Generated',
        description: 'Meeting minutes PDF is ready for sign-off',
      });

      onPDFGenerated();
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Could not generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              PDF Document
            </CardTitle>
            <CardDescription>
              Generate PDF for sign-off and distribution
            </CardDescription>
          </div>
          {hasPDF && (
            <Badge variant="success" className="gap-2">
              <CheckCircle className="h-3 w-3" />
              Generated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasPDF ? (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">
              {minutesGenerated 
                ? 'Generate a PDF document for official sign-off'
                : 'Generate meeting minutes first to create PDF'}
            </p>
            <Button
              onClick={handleGeneratePDF}
              disabled={!minutesGenerated || isGenerating}
              size="lg"
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="h-12 w-12 rounded-lg bg-success/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-medium">PDF Document Ready</p>
                <p className="text-sm text-muted-foreground">
                  Ready for sign-off and distribution
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => window.open(pdfUrl, '_blank')}
              >
                <Eye className="h-4 w-4" />
                View
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = pdfUrl || '';
                  a.download = 'meeting-minutes.pdf';
                  a.click();
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={handleGeneratePDF}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Regenerate PDF
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}