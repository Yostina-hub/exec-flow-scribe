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
    <Card className="p-0 border-0 bg-gradient-to-br from-background via-muted/10 to-background flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-bold text-lg bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            AI Summary
          </h3>
        </div>
        <div className="flex gap-2">
          {summary && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={copyToClipboard}
              className="gap-2 hover:bg-primary/10 hover-scale transition-all rounded-full"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={generateSummary}
            disabled={isLoading || sourceIds.length === 0}
            className="gap-2 hover:bg-primary/10 hover-scale transition-all rounded-full"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6 animate-fade-in">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-ping" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Analyzing your sources...
                </p>
                <p className="text-sm text-muted-foreground">
                  Creating a comprehensive summary
                </p>
              </div>
            </div>
          ) : sourceIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6 animate-scale-in">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                <FileText className="h-10 w-10 text-purple-500/50" />
              </div>
              <div className="text-center space-y-2 max-w-xs">
                <p className="text-base font-semibold">No sources selected</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select sources from the left panel to generate an intelligent AI summary
                </p>
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-6 animate-fade-in">
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:bg-gradient-to-r prose-headings:from-foreground prose-headings:to-muted-foreground prose-headings:bg-clip-text prose-headings:text-transparent prose-p:leading-relaxed prose-li:leading-relaxed prose-strong:text-primary prose-strong:font-bold">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {normalizeAIMarkdown(summary)}
                </ReactMarkdown>
              </div>
              
              {sources.length > 0 && (
                <div className="border-t border-border/50 pt-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <FileText className="h-3 w-3 text-purple-500" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {sources.length} Source{sources.length !== 1 ? 's' : ''} Analyzed
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((source, idx) => (
                      <Badge 
                        key={source.id} 
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary/10 transition-colors cursor-default animate-fade-in rounded-lg"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <FileText className="h-3 w-3" />
                        <span className="font-medium">{source.title}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </Card>
  );
};
