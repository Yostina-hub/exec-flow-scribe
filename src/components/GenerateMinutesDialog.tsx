import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, Copy, Brain, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface GenerateMinutesDialogProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GenerateMinutesDialog = ({
  meetingId,
  open,
  onOpenChange,
}: GenerateMinutesDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [minutes, setMinutes] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<'lovable_ai' | 'notebooklm'>('lovable_ai');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAIProvider();
    }
  }, [open]);

  const fetchAIProvider = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('ai_provider_preferences')
        .select('provider')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setAiProvider(data.provider as 'lovable_ai' | 'notebooklm');
      }
    } catch (error) {
      console.error('Error fetching AI provider:', error);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-minutes', {
        body: { meetingId },
      });

      if (error) throw error;

      setMinutes(data.minutes);
      
      toast({
        title: 'Minutes generated',
        description: 'AI has successfully generated your meeting minutes',
      });
    } catch (error: any) {
      console.error('Error generating minutes:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate minutes',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(minutes);
    toast({
      title: 'Copied to clipboard',
      description: 'Meeting minutes copied successfully',
    });
  };

  const handleDownload = () => {
    const blob = new Blob([minutes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-minutes-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Meeting minutes saved to your device',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI-Generated Meeting Minutes
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Comprehensive summary of your meeting with key decisions and action items
            <Badge variant="outline" className="ml-2 gap-1">
              {aiProvider === 'lovable_ai' ? (
                <>
                  <Brain className="h-3 w-3" />
                  Lovable AI
                </>
              ) : (
                <>
                  <BookOpen className="h-3 w-3" />
                  NotebookLM
                </>
              )}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {!minutes && !isGenerating && (
          <div className="py-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">
              Generate a comprehensive meeting summary using AI
            </p>
            <Button onClick={handleGenerate} size="lg" className="gap-2">
              <FileText className="h-4 w-4" />
              Generate Minutes
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="py-12 text-center">
            <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">
              Analyzing transcripts and generating minutes...
            </p>
          </div>
        )}

        {minutes && !isGenerating && (
          <>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button size="sm" onClick={handleGenerate} className="gap-2">
                <FileText className="h-4 w-4" />
                Regenerate
              </Button>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{minutes}</ReactMarkdown>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
