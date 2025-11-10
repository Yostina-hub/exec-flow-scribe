import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AutoAnalysisIndicatorProps {
  sourceId: string;
}

export const AutoAnalysisIndicator = ({ sourceId }: AutoAnalysisIndicatorProps) => {
  const [status, setStatus] = useState<'analyzing' | 'completed' | 'none'>('none');

  useEffect(() => {
    checkAnalysisStatus();

    // Set up realtime subscription
    const channel = supabase
      .channel(`analysis-status-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notebook_intelligence_insights',
          filter: `source_id=eq.${sourceId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setStatus('completed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId]);

  const checkAnalysisStatus = async () => {
    try {
      const { data: insights } = await supabase
        .from("notebook_intelligence_insights")
        .select("id")
        .eq("source_id", sourceId)
        .limit(1);

      if (insights && insights.length > 0) {
        setStatus('completed');
      } else {
        // Check if source has metadata indicating it's being analyzed
        const { data: source } = await supabase
          .from("notebook_sources")
          .select("metadata")
          .eq("id", sourceId)
          .single();

        if (source?.metadata && typeof source.metadata === 'object') {
          const metadata = source.metadata as Record<string, any>;
          if (metadata.auto_analyzed) {
            setStatus('completed');
          } else {
            setStatus('analyzing');
          }
        } else {
          setStatus('analyzing');
        }
      }
    } catch (error) {
      console.error("Error checking analysis status:", error);
    }
  };

  if (status === 'none') return null;

  if (status === 'analyzing') {
    return (
      <Badge variant="outline" className="gap-2 bg-primary/10 border-primary/20">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">AI Analyzing...</span>
      </Badge>
    );
  }

  if (status === 'completed') {
    return (
      <Badge variant="outline" className="gap-2 bg-success/10 border-success/20 text-success">
        <CheckCircle2 className="h-3 w-3" />
        <span className="text-xs">AI Ready</span>
      </Badge>
    );
  }

  return null;
};
