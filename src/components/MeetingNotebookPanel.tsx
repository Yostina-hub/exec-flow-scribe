import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Users, 
  MessageSquare,
  Send,
  Loader2,
  BookOpen,
  LightbulbIcon,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  attendee_count?: number;
  agenda_count?: number;
}

interface MeetingNotebookPanelProps {
  meetings: Meeting[];
}

interface AIInsight {
  type: "summary" | "pattern" | "suggestion" | "answer";
  content: string;
  timestamp: Date;
}

export const MeetingNotebookPanel = ({ meetings }: MeetingNotebookPanelProps) => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasGeneratedOverview, setHasGeneratedOverview] = useState(false);

  const generateOverview = async () => {
    setIsAnalyzing(true);
    try {
      const response = await supabase.functions.invoke('generate-meeting-overview', {
        body: { meetings: meetings.slice(0, 20) } // Limit to recent 20 meetings
      });

      if (response.error) throw response.error;

      const data = response.data;

      const newInsights: AIInsight[] = [
        {
          type: "summary",
          content: data.summary || "Unable to generate summary at this time.",
          timestamp: new Date()
        }
      ];

      if (data.patterns && data.patterns.length > 0) {
        newInsights.push({
          type: "pattern",
          content: data.patterns.join("\n"),
          timestamp: new Date()
        });
      }

      if (data.suggestions && data.suggestions.length > 0) {
        newInsights.push({
          type: "suggestion",
          content: data.suggestions.join("\n"),
          timestamp: new Date()
        });
      }

      setInsights(newInsights);
      setHasGeneratedOverview(true);
      
      toast({
        title: "Analysis complete",
        description: "AI has analyzed your meetings"
      });
    } catch (error) {
      console.error('Error generating overview:', error);
      toast({
        title: "Analysis failed",
        description: "Could not analyze meetings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const response = await supabase.functions.invoke('query-meetings-ai', {
        body: { 
          query: query.trim(),
          meetings: meetings.slice(0, 20)
        }
      });

      if (response.error) throw response.error;

      const data = response.data;

      setInsights(prev => [...prev, {
        type: "answer",
        content: data.answer || "I couldn't find relevant information for your query.",
        timestamp: new Date()
      }]);

      setQuery("");
    } catch (error) {
      console.error('Error querying AI:', error);
      toast({
        title: "Query failed",
        description: "Could not process your question. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case "summary": return <BookOpen className="h-4 w-4" />;
      case "pattern": return <TrendingUp className="h-4 w-4" />;
      case "suggestion": return <LightbulbIcon className="h-4 w-4" />;
      case "answer": return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case "summary": return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "pattern": return "bg-purple-500/10 text-purple-700 border-purple-200";
      case "suggestion": return "bg-amber-500/10 text-amber-700 border-amber-200";
      case "answer": return "bg-green-500/10 text-green-700 border-green-200";
    }
  };

  if (meetings.length === 0) return null;

  return (
    <Card className="shadow-xl border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="w-6 h-6 text-primary" />
              AI Meeting Insights
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                NotebookLM
              </Badge>
            </CardTitle>
            <CardDescription>
              Ask questions and get intelligent insights about your meetings
            </CardDescription>
          </div>
          {!hasGeneratedOverview && (
            <Button 
              onClick={generateOverview} 
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Generate Overview
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{meetings.length}</div>
            <div className="text-xs text-muted-foreground">Total Meetings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {meetings.filter(m => m.status !== "completed").length}
            </div>
            <div className="text-xs text-muted-foreground">Upcoming</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {meetings.reduce((sum, m) => sum + (m.attendee_count || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Attendees</div>
          </div>
        </div>

        {/* AI Insights Display */}
        {insights.length > 0 && (
          <ScrollArea className="h-[300px] rounded-lg border bg-muted/30 p-4">
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <Card key={idx} className={`border ${getInsightColor(insight.type)}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-xs font-medium uppercase tracking-wide">
                          {insight.type}
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {insight.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Query Input */}
        <form onSubmit={handleQuerySubmit} className="space-y-3">
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Textarea
              placeholder="Ask anything about your meetings... (e.g., 'What are my most common meeting topics?' or 'Which meetings need follow-up?')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 min-h-[80px] resize-none"
              disabled={isAnalyzing}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full gap-2" 
            disabled={!query.trim() || isAnalyzing}
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Ask AI
              </>
            )}
          </Button>
        </form>

        {/* Suggested Questions */}
        {insights.length === 0 && !hasGeneratedOverview && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Suggested Questions
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "What meetings are coming up?",
                "Show me patterns in my schedule",
                "Which meetings had the most attendees?"
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
