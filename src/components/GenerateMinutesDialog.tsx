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
import { Loader2, FileText, Download, Copy, Brain, BookOpen, Languages } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { normalizeAIMarkdown } from '@/utils/markdownNormalizer';
import { NonTechnicalSummaryDialog } from './NonTechnicalSummaryDialog';
import { detectLanguage } from '@/utils/langDetect';

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
  const [originalMinutes, setOriginalMinutes] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<'am' | 'en' | 'or' | 'so'>('am');
  const [detectedLanguage, setDetectedLanguage] = useState<'am' | 'en' | 'or' | 'so'>('am');
  const [isTranslating, setIsTranslating] = useState(false);
  const [aiProvider, setAiProvider] = useState<'lovable_ai' | 'notebooklm'>('lovable_ai');
  const [showNonTechnical, setShowNonTechnical] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAIProvider();
      fetchExistingMinutes();
      fetchMeetingTitle();
    }
  }, [open]);

  const fetchMeetingTitle = async () => {
    try {
      const { data } = await supabase
        .from('meetings')
        .select('title')
        .eq('id', meetingId)
        .single();
      
      if (data) {
        setMeetingTitle(data.title);
      }
    } catch (error) {
      console.error('Error fetching meeting title:', error);
    }
  };

  const fetchExistingMinutes = async () => {
    try {
      // Prefer the latest saved minutes version
      const { data: latest, error } = await supabase
        .from('minutes_versions')
        .select('content, created_at')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && latest?.content) {
        setMinutes(latest.content);
        setOriginalMinutes(latest.content);
        
        // Detect language
        const detected = detectLanguage(latest.content);
        if (detected === 'am' || detected === 'en' || detected === 'or' || detected === 'so') {
          setDetectedLanguage(detected);
          setCurrentLanguage(detected);
        }
      } else {
        // Fallback for legacy flows where raw markdown might be in meetings.minutes_url
        const { data: m } = await supabase
          .from('meetings')
          .select('minutes_url')
          .eq('id', meetingId)
          .maybeSingle();
        if (m?.minutes_url) setMinutes(m.minutes_url);
      }
    } catch (error) {
      console.error('Error fetching existing minutes:', error);
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be signed in to generate minutes.');
      }

      const { data, error } = await supabase.functions.invoke('generate-minutes', {
        body: { meetingId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        // Backend returns user-friendly error messages
        const errorMsg = typeof data.error === 'string' 
          ? data.error.split('\n\n📋')[0].split('\n\nTip:')[0] // Get main message
          : 'Failed to generate minutes';
        throw new Error(errorMsg);
      }

      setMinutes(data.minutes);
      setOriginalMinutes(data.minutes);
      
      // Detect language (default to Amharic)
      const detected = detectLanguage(data.minutes);
      if (detected === 'am' || detected === 'en' || detected === 'or' || detected === 'so') {
        setDetectedLanguage(detected);
        setCurrentLanguage(detected);
      } else {
        setDetectedLanguage('am');
        setCurrentLanguage('am');
      }
      
      toast({
        title: 'Success!',
        description: 'Meeting minutes generated successfully in ' + 
          (detected === 'am' ? 'Amharic' : detected === 'or' ? 'Afaan Oromo' : detected === 'so' ? 'Somali' : 'English'),
      });
    } catch (error: any) {
      console.error('Error generating minutes:', error);
      
      const msg = error?.message || (typeof error === 'string' ? error : 'Could not generate minutes');
      const is402 = /Payment required|💳|402|insufficient_quota|exceeded your current quota/i.test(msg);
      const is429 = /Rate limit|⏳|Too Many Requests|429/i.test(msg);
      
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Generation Failed',
        description: is402 
          ? 'Lovable AI credits exhausted. Go to Settings → AI Provider tab to add your own OpenAI or Gemini API keys, or wait and try again later.'
          : is429
          ? 'All AI providers are temporarily rate limited. Wait 2-3 minutes and try again, or add your own API keys in Settings → AI Provider tab.'
          : msg,
        variant: 'destructive',
        duration: is429 || is402 ? 10000 : 5000,
        action: (is402 || is429) ? (
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
            Open Settings
          </Button>
        ) : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(minutes);
      toast({
        title: 'Copied to clipboard',
        description: 'Meeting minutes copied successfully',
      });
    } catch (error) {
      console.error('Clipboard error:', error);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard. Please check clipboard permissions.',
        variant: 'destructive',
      });
    }
  };

  const handleLanguageToggle = async (targetLang: 'am' | 'en' | 'or' | 'so') => {
    if (targetLang === currentLanguage) return;
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-minutes', {
        body: {
          content: originalMinutes,
          targetLanguage: targetLang,
        },
      });

      if (error) throw error;

      if (data?.translatedContent) {
        setMinutes(data.translatedContent);
        setCurrentLanguage(targetLang);
        toast({
          title: 'Translated',
          description: `Minutes translated to ${targetLang === 'am' ? 'Amharic' : targetLang === 'or' ? 'Afaan Oromo' : targetLang === 'so' ? 'Somali' : 'English'}`,
        });
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      toast({
        title: 'Translation Failed',
        description: error.message || 'Failed to translate minutes',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([minutes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const langSuffix = currentLanguage === 'am' ? '-amharic' : currentLanguage === 'or' ? '-oromo' : currentLanguage === 'so' ? '-somali' : '-english';
    a.download = `meeting-minutes${langSuffix}-${new Date().toISOString().split('T')[0]}.md`;
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
          <DialogDescription>
            <div className="flex items-center gap-2">
              <span>Comprehensive summary of your meeting with key decisions and action items</span>
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
            </div>
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
            <div className="flex gap-2 justify-between items-center mb-4">
              <div className="flex gap-2">
                <Button
                  variant={currentLanguage === 'am' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageToggle('am')}
                  disabled={isTranslating}
                  className="gap-2"
                >
                  {isTranslating && currentLanguage !== 'am' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  አማርኛ
                </Button>
                <Button
                  variant={currentLanguage === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageToggle('en')}
                  disabled={isTranslating}
                  className="gap-2"
                >
                  {isTranslating && currentLanguage !== 'en' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  English
                </Button>
                <Button
                  variant={currentLanguage === 'or' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageToggle('or')}
                  disabled={isTranslating}
                  className="gap-2"
                >
                  {isTranslating && currentLanguage !== 'or' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  Afaan Oromo
                </Button>
                <Button
                  variant={currentLanguage === 'so' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageToggle('so')}
                  disabled={isTranslating}
                  className="gap-2"
                >
                  {isTranslating && currentLanguage !== 'so' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                  Af-Soomaali
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNonTechnical(true)}
                  className="gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Non-Technical
                </Button>
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
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-primary prose-headings:font-bold
                prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:border-b-2 prose-h1:border-primary/30 prose-h1:pb-3
                prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-primary/90 prose-h2:border-l-4 prose-h2:border-primary/40 prose-h2:pl-4
                prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-primary/80
                prose-strong:text-accent prose-strong:font-semibold
                prose-ul:my-4 prose-li:my-2 prose-li:leading-relaxed
                prose-p:leading-relaxed prose-p:my-3 prose-p:text-justify
                prose-a:text-primary prose-a:underline prose-a:font-medium
                prose-table:w-full prose-table:border-2 prose-table:border-primary/20 prose-table:my-6 prose-table:shadow-md
                prose-thead:bg-primary/5
                prose-tr:border-b prose-tr:border-border
                prose-td:border prose-td:border-border/50 prose-td:p-3 prose-td:align-top
                prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-primary/10 prose-th:font-bold prose-th:text-primary
                [&>ul>li]:before:text-primary [&>ul>li]:before:font-bold [&>ul>li]:before:text-lg
                [&>ol>li]:marker:text-primary [&>ol>li]:marker:font-bold
                whitespace-pre-wrap break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    p: ({node, ...props}) => <p className="my-3 leading-7" {...props} />,
                    h1: ({node, ...props}) => <h1 className="scroll-m-20 first:mt-0" {...props} />,
                    h2: ({node, ...props}) => <h2 className="scroll-m-20" {...props} />,
                    h3: ({node, ...props}) => <h3 className="scroll-m-20" {...props} />,
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full" {...props} />
                      </div>
                    ),
                  }}
                >
                  {normalizeAIMarkdown(minutes)}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </>
        )}

        <NonTechnicalSummaryDialog
          content={minutes}
          language={currentLanguage}
          meetingTitle={meetingTitle}
          open={showNonTechnical}
          onOpenChange={setShowNonTechnical}
        />
      </DialogContent>
    </Dialog>
  );
};
