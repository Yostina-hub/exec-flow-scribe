import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, FileText } from "lucide-react";
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
    <Card className="p-0 h-full flex flex-col border-0 bg-transparent">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-base">Chat</h3>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setMessages([])}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-base">Ask questions about your sources and get answers with citations</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`space-y-2 ${msg.role === "user" ? "text-right" : ""}`}>
                <div className={`inline-block max-w-[85%] px-4 py-3 rounded-2xl ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/60"
                }`}>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-start">
                    {msg.sources.map((source, srcIdx) => (
                      <Badge key={srcIdx} variant="outline" className="text-xs">
                        {source.title}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-4 py-4 border-t space-y-4 bg-background">
        <div className="flex gap-3">
          <Input
            placeholder="Start typing..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            disabled={isLoading || sourceIds.length === 0}
            className="flex-1 bg-muted/40 border-muted-foreground/20 rounded-full px-4 h-11"
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {sourceIds.length} source{sourceIds.length !== 1 ? 's' : ''}
            </span>
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim() || sourceIds.length === 0}
              size="icon"
              className="shrink-0 rounded-full h-11 w-11"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {messages.length === 0 && sourceIds.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            <button
              onClick={() => setInput("What are the key insights from these sources?")}
              className="flex-shrink-0 px-4 py-3 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors text-sm text-left border border-muted-foreground/10"
            >
              What are the key insights from these sources?
            </button>
            <button
              onClick={() => setInput("Summarize the main points")}
              className="flex-shrink-0 px-4 py-3 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors text-sm text-left border border-muted-foreground/10"
            >
              Summarize the main points
            </button>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-muted-foreground/10">
          AI can be inaccurate; please double check its responses.
        </div>
      </div>
    </Card>
  );
};
