import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, FileText, Copy, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface MeetingChatPanelProps {
  meetingId: string;
  sourceIds?: string[];
  sourceTitles?: Array<{id: string; title: string; type: string}>;
}

const MeetingChatPanel = ({ meetingId, sourceIds, sourceTitles }: MeetingChatPanelProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSummary, setAutoSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`meeting-chat-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_chat_messages",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  useEffect(() => {
    // Generate summary whenever sourceIds change
    if (sourceIds && sourceIds.length > 0) {
      generateAutoSummary();
    }
  }, [sourceIds]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateAutoSummary = async () => {
    if (!sourceIds || sourceIds.length === 0) return;
    
    setSummaryLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-source-summary", {
        body: { sourceIds },
      });

      if (error) throw error;
      setAutoSummary(data.summary);
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Unable to generate summary",
        description: "Please add credits to your workspace to use AI features.",
        variant: "destructive",
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadChatHistory = async () => {
    const { data, error } = await supabase
      .from("meeting_chat_messages")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading chat history:", error);
      return;
    }

    setMessages(data?.map(msg => ({
      ...msg,
      role: msg.role as "user" | "assistant"
    })) || []);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(autoSummary || "");
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Summary has been copied to your clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userQuery = query.trim();
    setQuery("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("meeting-chat", {
        body: { meetingId, query: userQuery },
      });

      if (error) throw error;

      // Messages are added via realtime subscription
      if (!data.answer) {
        throw new Error("No response received");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "What were the main decisions made?",
    "Summarize the action items",
    "What topics were discussed?",
    "Who spoke the most?",
  ];

  return (
    <div className="flex flex-col h-full p-4">
      <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
        {messages.length === 0 ? (
          summaryLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Extracting summary from your sources...</p>
            </div>
          ) : autoSummary ? (
            <div className="w-full max-w-5xl mx-auto space-y-6">
              {/* Title Section */}
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Notebook guide
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{sourceIds?.length || 0} source{(sourceIds?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Sources Tags */}
              {sourceTitles && sourceTitles.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {sourceTitles.map((source) => (
                    <Badge 
                      key={source.id} 
                      variant="secondary" 
                      className="text-xs px-3 py-1 hover:bg-secondary/80 transition-colors"
                    >
                      {source.title}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Summary Card */}
              <div className="relative group">
                <div className="bg-muted/50 rounded-lg p-6 border hover:border-primary/50 transition-all duration-200">
                  <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        strong: ({ children }) => (
                          <strong className="font-semibold text-foreground">{children}</strong>
                        ),
                        p: ({ children }) => <p className="mb-0">{children}</p>,
                      }}
                    >
                      {autoSummary}
                    </ReactMarkdown>
                  </div>
                </div>
                
                {/* Floating Copy Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : sourceIds && sourceIds.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing your sources...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select sources to see an auto-generated summary
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about decisions, action items, discussions..."
            className="resize-none flex-1"
            rows={2}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={loading || !query.trim()} size="icon" className="h-auto">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        {/* Suggested questions at bottom */}
        {messages.length > 0 && (
          <div className="flex gap-2 flex-wrap pt-2 border-t">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setQuery(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingChatPanel;
