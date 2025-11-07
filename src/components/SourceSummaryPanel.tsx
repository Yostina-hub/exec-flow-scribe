import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { normalizeAIMarkdown } from "@/utils/markdownNormalizer";

interface SourceSummaryPanelProps {
  sourceIds: string[];
  targetLanguage?: string;
}

export const SourceSummaryPanel = ({ sourceIds, targetLanguage }: SourceSummaryPanelProps) => {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const { toast } = useToast();

  const generateSummary = async () => {
    if (sourceIds.length === 0) {
      toast({
        title: "No sources selected",
        description: "Please select sources to generate a summary",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-source-summary', {
        body: { sourceIds, targetLanguage }
      });

      if (error) throw error;

      setSummary(data.summary);
      setSources(data.sources || []);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sourceIds.length > 0) {
      generateSummary();
    } else {
      setSummary("");
      setSources([]);
    }
  }, [sourceIds, targetLanguage]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: "Copied!",
        description: "Summary copied to clipboard",
      });
    } catch (error) {
      console.error('Clipboard error:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard. Please check clipboard permissions.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-0 border-0 bg-muted/30 flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <h3 className="font-semibold text-lg">Summary</h3>
        <div className="flex gap-2">
          {summary && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={copyToClipboard}
              className="gap-2 hover:bg-muted/60"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={generateSummary}
            disabled={isLoading || sourceIds.length === 0}
            className="gap-2 hover:bg-muted/60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6">
        <div className="py-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating summary...</p>
            </div>
          ) : summary ? (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {normalizeAIMarkdown(summary)}
                </ReactMarkdown>
              </div>
              
              {sources.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-3">Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((source, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {source.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-20">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base">Select sources to generate a summary</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
