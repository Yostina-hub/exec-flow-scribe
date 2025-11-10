import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Star, Edit, RefreshCw, Layout, Wand2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const SummaryQualityAnalytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['summary-quality-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('summary_quality_analytics')
        .select('*')
        .order('total_summaries', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Loading Analytics...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Group by generation method
  const standardData = analytics?.filter(a => a.generation_method === 'standard') || [];
  const templateData = analytics?.filter(a => a.generation_method === 'template') || [];

  const calculateMethodStats = (data: any[]) => {
    if (data.length === 0) return null;
    
    const totals = data.reduce((acc, curr) => ({
      summaries: acc.summaries + (curr.total_summaries || 0),
      avgRating: acc.avgRating + ((curr.avg_rating || 0) * (curr.total_summaries || 0)),
      avgEdits: acc.avgEdits + ((curr.avg_edits || 0) * (curr.total_summaries || 0)),
      regenerations: acc.regenerations + (curr.regeneration_count || 0),
      positiveRatings: acc.positiveRatings + (curr.positive_ratings || 0),
      ratedCount: acc.ratedCount + (curr.rated_count || 0)
    }), { summaries: 0, avgRating: 0, avgEdits: 0, regenerations: 0, positiveRatings: 0, ratedCount: 0 });

    return {
      totalSummaries: totals.summaries,
      avgRating: totals.ratedCount > 0 ? (totals.avgRating / totals.summaries).toFixed(1) : 'N/A',
      avgEdits: (totals.avgEdits / totals.summaries).toFixed(1),
      regenerationRate: totals.summaries > 0 ? ((totals.regenerations / totals.summaries) * 100).toFixed(0) : '0',
      satisfactionRate: totals.ratedCount > 0 ? ((totals.positiveRatings / totals.ratedCount) * 100).toFixed(0) : '0'
    };
  };

  const standardStats = calculateMethodStats(standardData);
  const templateStats = calculateMethodStats(templateData);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Summary Quality Analytics
        </CardTitle>
        <CardDescription>
          Compare standard vs template-based generation quality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standard Method Card */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Standard Generation
                    </CardTitle>
                    <Badge variant="secondary">
                      {standardStats?.totalSummaries || 0} summaries
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {standardStats ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          Avg Rating
                        </span>
                        <span className="font-semibold">{standardStats.avgRating}/5</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Edit className="h-4 w-4" />
                          Avg Edits
                        </span>
                        <span className="font-semibold">{standardStats.avgEdits}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-4 w-4" />
                          Regeneration Rate
                        </span>
                        <span className="font-semibold">{standardStats.regenerationRate}%</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Satisfaction
                          </span>
                          <span className="font-semibold">{standardStats.satisfactionRate}%</span>
                        </div>
                        <Progress value={Number(standardStats.satisfactionRate)} className="h-2" />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Template Method Card */}
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Template-Based
                    </CardTitle>
                    <Badge variant="secondary">
                      {templateStats?.totalSummaries || 0} summaries
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templateStats ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          Avg Rating
                        </span>
                        <span className="font-semibold">{templateStats.avgRating}/5</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Edit className="h-4 w-4" />
                          Avg Edits
                        </span>
                        <span className="font-semibold">{templateStats.avgEdits}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-4 w-4" />
                          Regeneration Rate
                        </span>
                        <span className="font-semibold">{templateStats.regenerationRate}%</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Satisfaction
                          </span>
                          <span className="font-semibold">{templateStats.satisfactionRate}%</span>
                        </div>
                        <Progress value={Number(templateStats.satisfactionRate)} className="h-2" />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="standard" className="space-y-4 mt-4">
            {standardData.length > 0 ? (
              <div className="space-y-2">
                {standardData.map((item, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{item.summary_type.replace('_', ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-semibold">{item.total_summaries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Rating:</span>
                        <span className="font-semibold">{item.avg_rating?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Edits:</span>
                        <span className="font-semibold">{item.avg_edits?.toFixed(1)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No standard summaries yet</p>
            )}
          </TabsContent>

          <TabsContent value="template" className="space-y-4 mt-4">
            {templateData.length > 0 ? (
              <div className="space-y-2">
                {templateData.map((item, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{item.summary_type.replace('_', ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-semibold">{item.total_summaries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Rating:</span>
                        <span className="font-semibold">{item.avg_rating?.toFixed(1) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Edits:</span>
                        <span className="font-semibold">{item.avg_edits?.toFixed(1)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No template-based summaries yet</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
