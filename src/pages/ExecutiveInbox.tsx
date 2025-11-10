import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  FileText,
  CheckCircle2,
  ArrowLeft,
  Network
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DocumentRelationshipMap } from "@/components/DocumentRelationshipMap";
import { DocumentClusters } from "@/components/DocumentClusters";
import { DocumentNetworkGraph3D } from "@/components/DocumentNetworkGraph3D";

export default function ExecutiveInbox() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["executive-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notebook_intelligence_insights")
        .select(`
          *,
          notebook_sources (
            id,
            title,
            source_type,
            notebook_id,
            created_at
          )
        `)
        .eq("requires_action", true)
        .order("priority_score", { ascending: false })
        .order("response_deadline", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const filteredDocuments = documents?.filter(doc => 
    filter === "all" ? true : doc.urgency_level === filter
  );

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 8) return "text-destructive";
    if (score >= 6) return "text-orange-500";
    if (score >= 4) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) return { text: "Overdue", color: "text-destructive" };
    if (hoursUntil < 4) return { text: formatDistanceToNow(deadlineDate, { addSuffix: true }), color: "text-destructive" };
    if (hoursUntil < 24) return { text: formatDistanceToNow(deadlineDate, { addSuffix: true }), color: "text-orange-500" };
    return { text: formatDistanceToNow(deadlineDate, { addSuffix: true }), color: "text-muted-foreground" };
  };

  const markAsHandled = async (insightId: string) => {
    await supabase
      .from("notebook_intelligence_insights")
      .update({ requires_action: false })
      .eq("id", insightId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: documents?.length || 0,
    critical: documents?.filter(d => d.urgency_level === "critical").length || 0,
    high: documents?.filter(d => d.urgency_level === "high").length || 0,
    overdue: documents?.filter(d => d.response_deadline && new Date(d.response_deadline) < new Date()).length || 0,
  };

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/executive-advisor")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Executive Inbox
              </h1>
            </div>
            <p className="text-muted-foreground ml-14">
              AI-prioritized documents requiring your attention
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
                </div>
                <Clock className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Relationship Map */}
        <DocumentRelationshipMap />

        {/* Document Clusters */}
        <DocumentClusters />

        {/* 3D Network Graph */}
        <DocumentNetworkGraph3D />

        {/* Filters */}
        <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="critical">Critical ({stats.critical})</TabsTrigger>
            <TabsTrigger value="high">High ({stats.high})</TabsTrigger>
            <TabsTrigger value="medium">Medium</TabsTrigger>
            <TabsTrigger value="low">Low</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4 mt-6">
            {filteredDocuments?.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No documents in this category</p>
                </CardContent>
              </Card>
            ) : (
              filteredDocuments?.map((doc) => {
                const deadline = getDeadlineStatus(doc.response_deadline);
                return (
                  <Card 
                    key={doc.id}
                    className="hover:shadow-lg transition-all cursor-pointer border-l-4"
                    style={{
                      borderLeftColor: doc.urgency_level === "critical" ? "rgb(239 68 68)" :
                                      doc.urgency_level === "high" ? "rgb(249 115 22)" :
                                      doc.urgency_level === "medium" ? "rgb(234 179 8)" :
                                      "rgb(156 163 175)"
                    }}
                    onClick={() => navigate(`/notebooks?source=${doc.source_id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getUrgencyColor(doc.urgency_level)}>
                              {doc.urgency_level?.toUpperCase()}
                            </Badge>
                            <span className={`flex items-center gap-1 text-sm font-semibold ${getPriorityColor(doc.priority_score)}`}>
                              <TrendingUp className="h-4 w-4" />
                              Priority {doc.priority_score}/10
                            </span>
                            {deadline && (
                              <span className={`flex items-center gap-1 text-sm ${deadline.color}`}>
                                <Clock className="h-4 w-4" />
                                {deadline.text}
                              </span>
                            )}
                          </div>
                          <CardTitle className="text-lg">
                            {doc.notebook_sources?.title || "Untitled Document"}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {doc.notebook_sources?.source_type} • Added {formatDistanceToNow(new Date(doc.notebook_sources?.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsHandled(doc.id);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Handled
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Executive Summary</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {(doc.insights as any)?.summary || "No summary available"}
                          </p>
                        </div>
                        
                        {(doc.insights as any)?.recommendedActions && (doc.insights as any).recommendedActions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1">Recommended Actions</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {(doc.insights as any).recommendedActions.slice(0, 2).map((action: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span className="line-clamp-1">{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(doc.insights as any)?.riskAssessment && (
                          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {(doc.insights as any).riskAssessment}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
