import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Network, 
  RefreshCw, 
  Loader2,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface DocumentNode {
  id: string;
  title: string;
  urgency: string;
  priority: number;
}

interface Relationship {
  id: string;
  source_document_id: string;
  related_document_id: string;
  relationship_type: string;
  relationship_strength: number;
  relationship_summary: string;
}

export const DocumentRelationshipMap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: relationships, isLoading, refetch } = useQuery({
    queryKey: ["document-relationships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notebook_document_relationships")
        .select(`
          *,
          source:notebook_sources!source_document_id (
            id,
            title,
            notebook_intelligence_insights (
              urgency_level,
              priority_score
            )
          ),
          related:notebook_sources!related_document_id (
            id,
            title,
            notebook_intelligence_insights (
              urgency_level,
              priority_score
            )
          )
        `)
        .order("relationship_strength", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const analyzeRelationships = async () => {
    if (!user?.id) return;

    setIsAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke("analyze-document-relationships", {
        body: { userId: user.id },
      });

      if (error) throw error;

      toast.success("Document relationships analyzed successfully");
      refetch();
    } catch (error) {
      console.error("Error analyzing relationships:", error);
      toast.error("Failed to analyze document relationships");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case "follow_up": return <ArrowRight className="h-4 w-4" />;
      case "contradicts": return <AlertCircle className="h-4 w-4" />;
      case "supports": return <CheckCircle2 className="h-4 w-4" />;
      case "similar_topic": return <GitBranch className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "follow_up": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "contradicts": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "supports": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "similar_topic": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "referenced_in": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "prerequisite": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const groupedRelationships = relationships?.reduce((acc: any, rel: any) => {
    const sourceId = rel.source_document_id;
    if (!acc[sourceId]) {
      acc[sourceId] = {
        document: rel.source,
        related: []
      };
    }
    acc[sourceId].related.push(rel);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Document Relationship Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Document Relationship Map
          </CardTitle>
          <Button
            onClick={analyzeRelationships}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          AI-detected semantic connections between your documents
        </p>
      </CardHeader>
      <CardContent>
        {!relationships || relationships.length === 0 ? (
          <div className="text-center py-8">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No document relationships found yet
            </p>
            <Button onClick={analyzeRelationships} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Analyze Documents
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedRelationships || {}).map(([sourceId, group]: [string, any]) => (
              <div key={sourceId} className="space-y-3">
                <div 
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/notebooks?source=${sourceId}`)}
                >
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold">{group.document?.title || "Untitled"}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {group.document?.notebook_intelligence_insights?.[0] && (
                        <>
                          <Badge variant="outline" className="text-xs">
                            Priority {group.document.notebook_intelligence_insights[0].priority_score}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {group.document.notebook_intelligence_insights[0].urgency_level}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-8 space-y-2">
                  {group.related.map((rel: any) => (
                    <div
                      key={rel.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getRelationshipColor(rel.relationship_type)}`}
                      onClick={() => navigate(`/notebooks?source=${rel.related_document_id}`)}
                    >
                      <div className="mt-0.5">
                        {getRelationshipIcon(rel.relationship_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {rel.related?.title || "Untitled"}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {rel.relationship_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-80 line-clamp-2">
                          {rel.relationship_summary}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-background/30 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-current opacity-50"
                              style={{ width: `${rel.relationship_strength * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {Math.round(rel.relationship_strength * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
