import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, FileText, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; title: string; type: string }>;
}

interface ChatWithCitationsProps {
  sourceIds: string[];
}

export const ChatWithCitations = ({ sourceIds }: ChatWithCitationsProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async () => {
    if (!input.trim() || sourceIds.length === 0) {
      toast({
        title: "Cannot send message",
        description: sourceIds.length === 0 ? "Please select sources first" : "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-citations', {
        body: { query: input, sourceIds }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
        sources: data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-0 h-full flex flex-col border-0 bg-muted/30">
      {/* Chat Input Section - Now at Top */}
      <div className="shrink-0 border-b border-border/50 bg-card/50">
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ask in any language (English, አማርኛ, العربية, 中文...)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
              disabled={isLoading || sourceIds.length === 0}
              className="flex-1 bg-background border-border/50 rounded-full px-5 h-12 text-base"
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {sourceIds.length} source{sourceIds.length !== 1 ? 's' : ''}
              </span>
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !input.trim() || sourceIds.length === 0}
                size="icon"
                className="shrink-0 rounded-full h-12 w-12"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {messages.length === 0 && sourceIds.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setInput("What are the key insights from these sources?")}
                className="w-full px-5 py-4 rounded-2xl bg-muted/60 hover:bg-muted/80 transition-colors text-sm text-left border border-border/50"
              >
                What are the key insights from these sources?
              </button>
              <button
                onClick={() => setInput("Summarize the main points")}
                className="w-full px-5 py-4 rounded-2xl bg-muted/60 hover:bg-muted/80 transition-colors text-sm text-left border border-border/50"
              >
                Summarize the main points
              </button>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center pt-1">
            AI can be inaccurate; please double check its responses.
          </div>
        </div>
      </div>

      {/* Messages Section - Now Below Input */}
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-6 py-6">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-sm">Your conversation will appear here</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className="space-y-3">
                  {msg.role === "user" && (
                    <div className="text-sm text-muted-foreground">
                      • {msg.content}
                    </div>
                  )}
                  
                  {msg.role === "assistant" && (
                    <div className="space-y-4">
                      <ScrollArea className="max-h-[400px] pr-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </ScrollArea>
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((source, srcIdx) => (
                            <Badge key={srcIdx} variant="outline" className="text-xs">
                              {source.title}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="gap-2 text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          Save to note
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
