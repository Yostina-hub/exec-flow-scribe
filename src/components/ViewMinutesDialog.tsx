import { useState, useEffect, useDeferredValue, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Copy, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { useNavigate } from 'react-router-dom';
import { normalizeAIMarkdown } from '@/utils/markdownNormalizer';

interface ViewMinutesDialogProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ViewMinutesDialog = ({
  meetingId,
  open,
  onOpenChange,
}: ViewMinutesDialogProps) => {
  const [minutes, setMinutes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [showFull, setShowFull] = useState(false);
  const deferredMinutes = useDeferredValue(minutes);
  const { toast } = useToast();
  const navigate = useNavigate();

  const tooLarge = deferredMinutes.length > 200000; // raise threshold to avoid truncating typical minutes
  const hasHtml = useMemo(() => /<\/?[a-z][\s\S]*>/i.test(deferredMinutes), [deferredMinutes]);
  
  // Detect Ethiopic script (Amharic, Tigrinya, Oromo, etc.)
  const hasEthiopicScript = useMemo(() => {
    return /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/.test(deferredMinutes);
  }, [deferredMinutes]);
  
  const displayMinutes = useMemo(() => {
    if (!tooLarge || showFull) return deferredMinutes;
    return (
      deferredMinutes.slice(0, 20000) +
      "\n\n> Note: Preview truncated for performance. Click 'Render full document' to load all content."
    );
  }, [deferredMinutes, tooLarge, showFull]);

  useEffect(() => {
    if (open && meetingId) {
      fetchMinutes();
    }
  }, [open, meetingId]);

  const fetchMinutes = async () => {
    setIsLoading(true);
    try {
      // Fetch latest saved minutes (preferred) and meeting title in parallel
      const [latestMinutesRes, meetingRes] = await Promise.all([
        supabase
          .from('minutes_versions')
          .select('content, created_at')
          .eq('meeting_id', meetingId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('meetings')
          .select('title, minutes_url')
          .eq('id', meetingId)
          .maybeSingle(),
      ]);

      const { data: latestMinutes, error: minutesError } = latestMinutesRes as any;
      const { data: meeting, error: meetingError } = meetingRes as any;

      if (meetingError) {
        console.error('Error fetching meeting:', meetingError);
        throw meetingError;
      }
      
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      
      setMeetingTitle(meeting?.title || 'Untitled Meeting');

      // Prefer minutes_versions.content; fallback to meetings.minutes_url if someone stored raw markdown there
      const content: string = latestMinutes?.content || meeting?.minutes_url || '';

      if (content) {
        const normalized = normalizeAIMarkdown(content);
        console.log('Minutes loaded, content length:', normalized.length, 'characters');
        setMinutes(normalized);
      } else {
        toast({
          title: 'No Minutes Available',
          description: 'Generate AI minutes first',
          variant: 'destructive',
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error fetching minutes:', error);
      toast({
        title: 'Error',
        description: 'Could not load meeting minutes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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

  const handleDownload = async () => {
    try {
      // Get latest minutes version ID
      const { data: latestMinutes } = await supabase
        .from('minutes_versions')
        .select('id')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestMinutes) {
        toast({
          title: 'Error',
          description: 'No minutes version found',
          variant: 'destructive',
        });
        return;
      }

      // Fetch default Ethio Telecom brand kit
      const { data: brandKits } = await supabase
        .from('brand_kits')
        .select('id')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();

      // Generate branded PDF with Ethio Telecom branding
      const { data: pdfData, error } = await supabase.functions.invoke('generate-branded-pdf', {
        body: {
          meeting_id: meetingId,
          minutes_version_id: latestMinutes.id,
          brand_kit_id: brandKits?.id,
          include_watermark: false,
        },
      });

      if (error) throw error;

      // Download the Ethio Telecom branded PDF
      const blob = new Blob([pdfData.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethiotelecom-${meetingTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '✓ Branded PDF Downloaded',
        description: 'Ethio Telecom minutes saved to your device',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  const handleEditInEditor = () => {
    onOpenChange(false);
    navigate(`/meetings/${meetingId}/minutes`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {meetingTitle} - Minutes
          </DialogTitle>
          <DialogDescription>
            Review the meeting minutes and export or edit as needed
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Loading minutes...</p>
          </div>
        ) : (
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
              {tooLarge && !showFull && (
                <Button variant="secondary" size="sm" onClick={() => setShowFull(true)} className="gap-2">
                  Render full document
                </Button>
              )}
              <Button size="sm" onClick={handleEditInEditor} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open in Editor
              </Button>
            </div>

            {tooLarge && !showFull && (
              <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-sm flex items-center justify-between">
                <span>Large document detected. Rendering a quick preview for performance.</span>
                <Button variant="secondary" size="sm" onClick={() => setShowFull(true)}>Render full document</Button>
              </div>
            )}

            <div className="h-[70vh] w-full overflow-auto pr-4 pb-8">
              <div className={`prose prose-sm dark:prose-invert max-w-none
                ${hasEthiopicScript ? 'font-ethiopic' : ''}
                prose-headings:text-primary prose-headings:font-bold
                prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:border-b-2 prose-h1:border-primary/30 prose-h1:pb-3
                prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-primary/90 prose-h2:border-l-4 prose-h2:border-primary/40 prose-h2:pl-4
                prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-primary/80
                prose-strong:text-accent prose-strong:font-semibold
                prose-ul:my-4 prose-li:my-2 ${hasEthiopicScript ? 'prose-li:leading-loose' : 'prose-li:leading-relaxed'}
                ${hasEthiopicScript ? 'prose-p:leading-loose prose-p:text-base' : 'prose-p:leading-relaxed'} prose-p:my-3
                prose-a:text-primary prose-a:underline prose-a:font-medium
                prose-table:w-full prose-table:border-2 prose-table:border-primary/20 prose-table:my-6 prose-table:shadow-md
                prose-thead:bg-primary/5
                prose-tr:border-b prose-tr:border-border
                prose-td:border prose-td:border-border/50 prose-td:p-3 prose-td:align-top ${hasEthiopicScript ? 'prose-td:text-base prose-td:leading-relaxed' : ''}
                prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-primary/10 prose-th:font-bold prose-th:text-primary
                [&>ul>li]:before:text-primary [&>ul>li]:before:font-bold [&>ul>li]:before:text-lg
                [&>ol>li]:marker:text-primary [&>ol>li]:marker:font-bold
                whitespace-pre-wrap break-words
                ${hasEthiopicScript ? '[&_*]:tracking-wide' : ''}`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={hasHtml ? [rehypeRaw] : []}
                  components={{
                    p: ({node, ...props}) => (
                      <p className={`my-3 ${hasEthiopicScript ? 'leading-loose text-[15px]' : 'leading-7'}`} {...props} />
                    ),
                    h1: ({node, ...props}) => (
                      <h1 className={`scroll-m-20 first:mt-0 ${hasEthiopicScript ? 'text-3xl leading-tight' : ''}`} {...props} />
                    ),
                    h2: ({node, ...props}) => (
                      <h2 className={`scroll-m-20 ${hasEthiopicScript ? 'text-2xl leading-snug' : ''}`} {...props} />
                    ),
                    h3: ({node, ...props}) => (
                      <h3 className={`scroll-m-20 ${hasEthiopicScript ? 'text-xl leading-snug' : ''}`} {...props} />
                    ),
                    li: ({node, ...props}) => (
                      <li className={hasEthiopicScript ? 'leading-loose my-2' : ''} {...props} />
                    ),
                    td: ({node, ...props}) => (
                      <td className={hasEthiopicScript ? 'text-[15px] leading-relaxed' : ''} {...props} />
                    ),
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-6">
                        <table className="min-w-full" {...props} />
                      </div>
                    )
                  }}
                >
                  {displayMinutes}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};