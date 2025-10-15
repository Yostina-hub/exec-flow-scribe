import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, Star, CheckCircle2, FileText } from 'lucide-react';

interface Decision {
  id: string;
  decision_text: string;
  context: string | null;
  timestamp: string;
  created_at: string;
}

interface Highlight {
  id: string;
  content: string;
  timestamp: string;
}

interface ContextPanelProps {
  meetingId: string;
}

export const ContextPanel = ({ meetingId }: ContextPanelProps) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch decisions
      const { data: decisionsData } = await supabase
        .from('decisions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (decisionsData) setDecisions(decisionsData);

      // Fetch highlights
      const { data: highlightsData } = await supabase
        .from('highlights')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (highlightsData) setHighlights(highlightsData);
    };

    fetchData();

    // Subscribe to real-time updates for decisions
    const decisionsChannel = supabase
      .channel('decisions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'decisions',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          setDecisions((prev) => [payload.new as Decision, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    // Subscribe to real-time updates for highlights
    const highlightsChannel = supabase
      .channel('highlights')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'highlights',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          setHighlights((prev) => [payload.new as Highlight, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(decisionsChannel);
      supabase.removeChannel(highlightsChannel);
    };
  }, [meetingId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Context & Insights
          </CardTitle>
          <CardDescription>Related decisions and key moments</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {/* Decisions Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <h4 className="text-sm font-semibold">Key Decisions</h4>
                  <Badge variant="secondary" className="ml-auto">
                    {decisions.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {decisions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No decisions recorded yet
                    </p>
                  ) : (
                    decisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="p-3 rounded-lg bg-success/5 border border-success/20"
                      >
                        <p className="text-sm font-medium mb-1">
                          {decision.decision_text}
                        </p>
                        {decision.context && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {decision.context}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatTime(decision.timestamp)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Highlights Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-warning" />
                  <h4 className="text-sm font-semibold">Highlights</h4>
                  <Badge variant="secondary" className="ml-auto">
                    {highlights.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {highlights.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No highlights tagged yet
                    </p>
                  ) : (
                    highlights.map((highlight) => (
                      <div
                        key={highlight.id}
                        className="p-3 rounded-lg bg-warning/5 border border-warning/20"
                      >
                        <p className="text-sm mb-2">{highlight.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(highlight.timestamp)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Related Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Previous meeting minutes and related decisions will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
