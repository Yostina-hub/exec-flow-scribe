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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const generateTranscriptDocument = async () => {
    setIsGenerating(true);
    try {
      // Fetch all transcriptions for the meeting
      const { data: transcriptions, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (!transcriptions || transcriptions.length === 0) {
        toast({
          title: 'No Transcription Data',
          description: 'No transcriptions available for this meeting.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch meeting details
      const { data: meeting } = await supabase
        .from('meetings')
        .select('start_time, end_time')
        .eq('id', meetingId)
        .single();

      // Build the complete transcript document
      let transcriptContent = `# Complete Meeting Transcription\n\n`;
      transcriptContent += `**Meeting:** ${meetingTitle}\n`;
      transcriptContent += `**Date:** ${new Date(meeting?.start_time || '').toLocaleDateString()}\n`;
      transcriptContent += `**Time:** ${new Date(meeting?.start_time || '').toLocaleTimeString()} - ${new Date(meeting?.end_time || '').toLocaleTimeString()}\n`;
      transcriptContent += `**Total Segments:** ${transcriptions.length}\n\n`;
      transcriptContent += `---\n\n`;

      // Group transcriptions by speaker
      let currentSpeaker = '';
      let currentBlock = '';
      let currentTimestamp = '';

      transcriptions.forEach((trans: any, index: number) => {
        const speaker = trans.speaker_name || 'Unknown Speaker';
        const timestamp = formatTimestamp(trans.timestamp);
        const content = trans.content || '';
        const confidence = trans.confidence ? ` (Confidence: ${(trans.confidence * 100).toFixed(0)}%)` : '';

        // If speaker changed, write the previous block and start a new one
        if (speaker !== currentSpeaker) {
          if (currentBlock) {
            transcriptContent += `**[${currentTimestamp}] ${currentSpeaker}:**\n${currentBlock}\n\n`;
          }
          currentSpeaker = speaker;
          currentBlock = content;
          currentTimestamp = timestamp;
        } else {
          // Same speaker, append to current block
          currentBlock += ' ' + content;
        }

        // Write the last segment if it's the final transcription
        if (index === transcriptions.length - 1) {
          transcriptContent += `**[${currentTimestamp}] ${currentSpeaker}:**\n${currentBlock}\n\n`;
        }
      });

      transcriptContent += `---\n\n`;
      transcriptContent += `*Document generated on: ${new Date().toLocaleString()}*\n`;
      transcriptContent += `*Total speaking segments: ${transcriptions.length}*\n`;

      // Create and download the file
      const blob = new Blob([transcriptContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      const filename = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}_Transcript_${new Date().toISOString().split('T')[0]}.md`;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Transcript Exported',
        description: `Complete transcription saved as ${filename}`,
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
