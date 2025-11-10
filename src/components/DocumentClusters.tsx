import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  FolderTree, 
  RefreshCw, 
  Loader2,
  FileText,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistanceToNow } from "date-fns";

interface DocumentCluster {
  name: string;
  description: string;
  theme: string;
  color: string;
  documentIds: string[];
  priority: "high" | "medium" | "low";
  documentCount: number;
  documents: Array<{
    id: string;
    title: string;
    sourceType: string;
    urgency: string;
    priority: number;
    createdAt: string;
  }>;
  avgPriority: number;
  hasUrgent: boolean;
}

export const DocumentClusters = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set());

  const { data: clustersData, isLoading, refetch } = useQuery({
    queryKey: ["document-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("cluster-documents", {
        body: { userId: user?.id },
      });

      if (error) throw error;
      return data as { clusters: DocumentCluster[]; totalDocuments: number };
    },
    enabled: false, // Only run when manually triggered
  });

  const analyzeClusters = async () => {
    if (!user?.id) return;

    setIsAnalyzing(true);
    try {
      await refetch();
      toast.success("Document clusters created successfully");
    } catch (error) {
      console.error("Error clustering documents:", error);
      toast.error("Failed to cluster documents");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCluster = (clusterName: string) => {
    const newOpen = new Set(openClusters);
    if (newOpen.has(clusterName)) {
      newOpen.delete(clusterName);
    } else {
      newOpen.add(clusterName);
    }
    setOpenClusters(newOpen);
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      red: "bg-red-500/10 text-red-600 border-red-500/20",
      blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      green: "bg-green-500/10 text-green-600 border-green-500/20",
      purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      orange: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      pink: "bg-pink-500/10 text-pink-600 border-pink-500/20",
      yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      teal: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    };
    return colorMap[color] || "bg-muted text-muted-foreground";
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
      case "medium": return <Badge variant="secondary" className="text-xs">Medium Priority</Badge>;
      case "low": return <Badge variant="outline" className="text-xs">Low Priority</Badge>;
      default: return null;
    }
  };

  if (isLoading || isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Document Clusters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">
              {isAnalyzing ? "Analyzing documents..." : "Loading..."}
            </span>
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
            <FolderTree className="h-5 w-5" />
            Document Clusters
          </CardTitle>
          <Button
            onClick={analyzeClusters}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clustering...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {clustersData ? "Re-cluster" : "Cluster Documents"}
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          AI-generated thematic groupings of related documents
        </p>
      </CardHeader>
      <CardContent>
        {!clustersData || clustersData.clusters.length === 0 ? (
          <div className="text-center py-8">
            <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No document clusters yet
            </p>
            <Button onClick={analyzeClusters} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clustering...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Cluster Documents
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {clustersData.clusters.length} clusters found • {clustersData.totalDocuments} total documents
              </p>
            </div>

            {clustersData.clusters.map((cluster, idx) => (
              <Collapsible
                key={idx}
                open={openClusters.has(cluster.name)}
                onOpenChange={() => toggleCluster(cluster.name)}
              >
                <Card className={`border-2 ${getColorClasses(cluster.color)}`}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{cluster.name}</h3>
                            {cluster.hasUrgent && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          <p className="text-sm opacity-80 mb-2">
                            {cluster.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {cluster.documentCount} documents
                            </Badge>
                            {getPriorityBadge(cluster.priority)}
                            <Badge variant="outline" className="text-xs capitalize">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Avg Priority: {cluster.avgPriority.toFixed(1)}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          {openClusters.has(cluster.name) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {cluster.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 bg-background/50 rounded-lg cursor-pointer hover:bg-background transition-colors"
                            onClick={() => navigate(`/notebooks?source=${doc.id}`)}
                          >
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {doc.sourceType}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {doc.urgency}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              P{doc.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
