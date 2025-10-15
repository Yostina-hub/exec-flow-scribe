import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DocumentViewer = () => {
  const [content, setContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetch('/Revised_ToR_CEO_Meeting_Digitization.md')
      .then(res => res.text())
      .then(setContent)
      .catch(err => {
        console.error('Error loading document:', err);
        toast({
          title: "Error",
          description: "Failed to load document",
          variant: "destructive"
        });
      });
  }, [toast]);

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Revised_ToR_CEO_Meeting_Digitization.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Success",
      description: "Document downloaded successfully"
    });
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Document content copied to clipboard"
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Revised Terms of Reference</h1>
              <p className="text-muted-foreground">CEO Meeting Workflow Digitization</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopyToClipboard} variant="outline">
              Copy Text
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        <Card className="p-8">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DocumentViewer;
