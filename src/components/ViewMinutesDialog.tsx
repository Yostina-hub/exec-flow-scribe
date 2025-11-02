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
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Copy, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

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
  const { toast } = useToast();
  const navigate = useNavigate();

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
          .single(),
      ]);

      const { data: latestMinutes, error: minutesError } = latestMinutesRes as any;
      const { data: meeting, error: meetingError } = meetingRes as any;

      if (meetingError) throw meetingError;
      setMeetingTitle(meeting?.title || '');

      // Prefer minutes_versions.content; fallback to meetings.minutes_url if someone stored raw markdown there
      const content: string = latestMinutes?.content || meeting?.minutes_url || '';

      if (content) {
        setMinutes(content);
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

  const handleDownload = () => {
    const blob = new Blob([minutes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/\s+/g, '-').toLowerCase()}-minutes-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Meeting minutes saved to your device',
    });
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
              <Button size="sm" onClick={handleEditInEditor} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open in Editor
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