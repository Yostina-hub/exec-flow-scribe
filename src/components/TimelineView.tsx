import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  source: string;
  category: string;
}

interface TimelineViewProps {
  sourceIds: string[];
}

export const TimelineView = ({ sourceIds }: TimelineViewProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const { toast } = useToast();

  const generateTimeline = async () => {
    if (sourceIds.length === 0) {
      toast({
        title: "No sources selected",
        description: "Please select at least one source",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-timeline', {
        body: { sourceIds }
      });

      if (error) throw error;

      setTimeline(data.timeline);
      toast({
        title: "Timeline Generated!",
        description: `Found ${data.timeline.length} events across ${data.sourceCount} sources`,
      });
    } catch (error) {
      console.error('Error generating timeline:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate timeline",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      milestone: "bg-blue-500",
      decision: "bg-purple-500",
      event: "bg-green-500",
      meeting: "bg-orange-500",
      deadline: "bg-red-500",
    };
    return colors[category.toLowerCase()] || "bg-gray-500";
  };

  return (
    <Card className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Timeline</h3>
        </div>
        <Button 
          onClick={generateTimeline} 
          disabled={isGenerating || sourceIds.length === 0}
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Timeline"
          )}
        </Button>
      </div>

      {timeline.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          <p>Select sources and click "Generate Timeline" to see a chronological view of events</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {timeline.map((event, idx) => (
              <div key={idx} className="relative pl-8 pb-8 last:pb-0">
                {/* Timeline line */}
                {idx < timeline.length - 1 && (
                  <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border" />
                )}
                
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${getCategoryColor(event.category)}`} />
                
                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">{event.date}</p>
                      <h4 className="font-semibold mt-1">{event.title}</h4>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {event.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  <p className="text-xs text-muted-foreground italic">
                    Source: {event.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};
