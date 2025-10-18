import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';

interface PDFPreviewDialogProps {
  open: boolean;
  url: string;
  onOpenChange: (open: boolean) => void;
}

export function PDFPreviewDialog({ open, url, onOpenChange }: PDFPreviewDialogProps) {
  const fileName = useMemo(() => {
    try {
      const u = new URL(url);
      return decodeURIComponent(u.pathname.split('/').pop() || 'document.pdf');
    } catch {
      return 'document.pdf';
    }
  }, [url]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  };

  const handleOpenNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Preview Document</DialogTitle>
        </DialogHeader>

        <div className="border rounded-md overflow-hidden bg-background">
          {url ? (
            <iframe title="PDF Preview" src={url} className="w-full h-[70vh]" />
          ) : (
            <div className="p-6 text-center text-muted-foreground">No document available</div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleOpenNewTab} disabled={!url}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </Button>
          <Button onClick={handleDownload} disabled={!url}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
