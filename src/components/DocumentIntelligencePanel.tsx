import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Target,
  TrendingUp,
  MessageSquare,
  Loader2,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentIntelligencePanelProps {
  sourceId: string;
  content?: string;
  title: string;
  sourceType: string;
}

export const DocumentIntelligencePanel = ({ 
  sourceId, 
  content: propContent, 
  title, 
  sourceType 
}: DocumentIntelligencePanelProps) => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [sourceContent, setSourceContent] = useState<string>(propContent || "");

  useEffect(() => {
    loadExistingAnalysis();
    if (!propContent) {
      loadSourceContent();
    }
  }, [sourceId, propContent]);

  useEffect(() => {
    // Set up realtime subscription for analysis updates
    const channel = supabase
      .channel(`source-analysis-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notebook_intelligence_insights',
          filter: `source_id=eq.${sourceId}`
        },
        (payload) => {
          console.log("New analysis received:", payload);
          loadExistingAnalysis();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId]);

  const loadSourceContent = async () => {
    try {
      const { data: sourceData, error } = await supabase
        .from("notebook_sources")
        .select("content, metadata")
        .eq("id", sourceId)
        .single();

      if (error) throw error;

      if (sourceData?.content) {
        setSourceContent(sourceData.content as string);
      }
    } catch (error) {
      console.error("Error loading source content:", error);
    }
  };

  const loadExistingAnalysis = async () => {
    try {
      const { data: sourceData, error } = await supabase
        .from("notebook_sources")
        .select("metadata")
        .eq("id", sourceId)
        .single();

      if (error) throw error;

      if (sourceData?.metadata && typeof sourceData.metadata === 'object') {
        const metadata = sourceData.metadata as Record<string, any>;
        if (metadata.ai_analysis) {
          setAnalysis(metadata.ai_analysis);
          
          // Also load structured insights if available
          const { data: insightsData } = await supabase
            .from("notebook_intelligence_insights")
            .select("*")
            .eq("source_id", sourceId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (insightsData && insightsData.insights) {
            setInsights(insightsData.insights as Record<string, any>);
          }
        }
      }
    } catch (error) {
      console.error("Error loading analysis:", error);
    }
  };

  const analyzeDocument = async () => {
    const contentToAnalyze = propContent || sourceContent;
    
    if (!contentToAnalyze || contentToAnalyze.trim().length < 50) {
      toast({
        title: "Content too short",
        description: "Document needs more content for meaningful analysis",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-document-intelligence",
        {
          body: { sourceId, content: contentToAnalyze, title, sourceType }
        }
      );

      if (error) throw error;

      setAnalysis(data.analysis);
      setInsights(data.insights);

      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your document with executive intelligence",
      });
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze document",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!analysis) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Executive Intelligence Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {isAnalyzing 
              ? "AI is analyzing your document with executive intelligence..."
              : "Get AI-powered strategic insights, key points, risk assessment, and decision guidance"
            }
          </p>
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Analysis in progress...</span>
            </div>
          ) : (
            <Button 
              onClick={analyzeDocument}
              disabled={isAnalyzing || !sourceContent}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Analyze with AI
            </Button>
          )}
          {!sourceContent && !isAnalyzing && (
            <p className="text-xs text-muted-foreground mt-2">
              Loading source content...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Executive Intelligence</CardTitle>
              <CardDescription>AI-powered strategic analysis</CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={analyzeDocument}
            disabled={isAnalyzing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Re-analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="full">Full Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {insights?.summary && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" />
                  Executive Summary
                </div>
                <p className="text-sm leading-relaxed bg-muted/50 p-4 rounded-lg">
                  {insights.summary}
                </p>
              </div>
            )}

            {insights?.keyPoints && insights.keyPoints.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Key Points
                </div>
                <div className="space-y-2">
                  {insights.keyPoints.map((point: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Badge variant="secondary" className="mt-0.5">{idx + 1}</Badge>
                      <span className="flex-1">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights?.riskAssessment && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Risk Assessment
                </div>
                <p className="text-sm leading-relaxed bg-warning/10 p-4 rounded-lg border border-warning/20">
                  {insights.riskAssessment}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 mt-4">
            {insights?.questions && insights.questions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Strategic Questions to Consider
                </div>
                <div className="space-y-2">
                  {insights.questions.map((question: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm flex-1">{question}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights?.responseGuidance && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Response Guidance
                </div>
                <p className="text-sm leading-relaxed bg-primary/10 p-4 rounded-lg border border-primary/20">
                  {insights.responseGuidance}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            {insights?.recommendedActions && insights.recommendedActions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Recommended Actions
                </div>
                <div className="space-y-2">
                  {insights.recommendedActions.map((action: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
                      <Badge variant="outline" className="shrink-0 border-success text-success">
                        {idx + 1}
                      </Badge>
                      <span className="text-sm flex-1">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button className="w-full gap-2">
                <Lightbulb className="h-4 w-4" />
                Create Action Items from Recommendations
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="full" className="mt-4">
            <ScrollArea className="h-[400px] w-full rounded-lg border bg-muted/30 p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                {analysis}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
