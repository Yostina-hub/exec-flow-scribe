import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TranscriptionDocumentExportProps {
  meetingId: string;
  meetingTitle: string;
}

export const TranscriptionDocumentExport = ({
  meetingId,
  meetingTitle,
}: TranscriptionDocumentExportProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();


  const generateTranscriptDocument = async () => {
    setIsGenerating(true);
    try {
      // Call edge function to generate transcript PDF
      const { data, error } = await supabase.functions.invoke('generate-transcript-pdf', {
        body: { meetingId },
      });

      if (error) throw error;

      if (!data?.html) {
        throw new Error('No HTML content received from server');
      }

      // Create and download the PDF (as HTML that can be printed to PDF)
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      const filename = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_Transcript_${new Date().toISOString().split('T')[0]}.html`;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Transcript Exported',
        description: `Complete transcription saved as ${filename}. Open it and use browser's "Print to PDF" to save as PDF.`,
      });
    } catch (error: any) {
      console.error('Error generating transcript document:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to generate transcript document',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Complete Transcription Document
        </CardTitle>
        <CardDescription>
          Export all transcription segments as a single formatted document with speaker attribution and timestamps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={generateTranscriptDocument}
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
              <Download className="h-4 w-4" />
              Export Complete Transcript
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
