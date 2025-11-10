import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckCircle2, XCircle, TrendingUp, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TemplateImprovementPanelProps {
  templateId: string;
}

export const TemplateImprovementPanel = ({ templateId }: TemplateImprovementPanelProps) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; suggestion: any } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['template-suggestions', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_improvement_suggestions' as any)
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-template-performance', {
        body: { templateId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Generated ${data.suggestionsCount} improvement suggestions`
      });
      queryClient.invalidateQueries({ queryKey: ['template-suggestions', templateId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setAnalyzing(false);
    }
  });

  const applyMutation = useMutation({
    mutationFn: async (suggestion: any) => {
      // Get current template
      const { data: template, error: fetchError } = await supabase
        .from('meeting_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      // Save current version to history
      const { data: versions } = await supabase
        .from('template_version_history' as any)
        .select('version_number')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false })
        .limit(1);

      const nextVersion = ((versions as any)?.[0]?.version_number || 0) + 1;

      await supabase
        .from('template_version_history' as any)
        .insert({
          template_id: templateId,
          version_number: nextVersion,
          template_data: template,
          change_description: `Applied AI suggestion: ${suggestion.rationale}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      // Apply the suggestion (simplified - you may need more complex logic)
      let updatedTemplate = { ...template };
      
      try {
        const suggestedData = JSON.parse(suggestion.suggested_prompt);
        updatedTemplate = { ...updatedTemplate, ...suggestedData };
      } catch {
        // If not JSON, treat as description update
        updatedTemplate.description = suggestion.suggested_prompt;
      }

      // Update template
      const { error: updateError } = await supabase
        .from('meeting_templates')
        .update(updatedTemplate)
        .eq('id', templateId);

      if (updateError) throw updateError;

      // Mark suggestion as applied
      const { error: statusError } = await supabase
        .from('template_improvement_suggestions' as any)
        .update({
          status: 'applied',
          applied_at: new Date().toISOString(),
          applied_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', suggestion.id);

      if (statusError) throw statusError;

      return suggestion;
    },
    onSuccess: () => {
      toast({
        title: "Suggestion Applied",
        description: "Template has been updated with AI improvements"
      });
      queryClient.invalidateQueries({ queryKey: ['template-suggestions', templateId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Apply",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setApplyingId(null);
      setConfirmDialog(null);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('template_improvement_suggestions' as any)
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-suggestions', templateId] });
    }
  });

  const handleAnalyze = () => {
    setAnalyzing(true);
    analyzeMutation.mutate();
  };

  const handleApply = (suggestion: any) => {
    setConfirmDialog({ open: true, suggestion });
  };

  const confirmApply = () => {
    if (confirmDialog?.suggestion) {
      setApplyingId(confirmDialog.suggestion.id);
      applyMutation.mutate(confirmDialog.suggestion);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'prompt_refinement': return <Sparkles className="h-4 w-4" />;
      case 'section_addition': return <TrendingUp className="h-4 w-4" />;
      case 'section_removal': return <XCircle className="h-4 w-4" />;
      case 'structure_change': return <AlertCircle className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const pending = suggestions?.filter(s => s.status === 'pending') || [];
  const applied = suggestions?.filter(s => s.status === 'applied') || [];
  const rejected = suggestions?.filter(s => s.status === 'rejected') || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Template Improvements
              </CardTitle>
              <CardDescription>
                Automatically generated suggestions based on user feedback and edit patterns
              </CardDescription>
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              size="sm"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Performance
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : suggestions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No suggestions yet. Click "Analyze Performance" to generate AI-powered improvements.</p>
            </div>
          ) : (
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">
                  Pending {pending.length > 0 && `(${pending.length})`}
                </TabsTrigger>
                <TabsTrigger value="applied">
                  Applied {applied.length > 0 && `(${applied.length})`}
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected {rejected.length > 0 && `(${rejected.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 mt-4">
                {pending.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No pending suggestions</p>
                ) : (
                  pending.map((suggestion) => (
                    <Card key={suggestion.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getSuggestionIcon(suggestion.suggestion_type)}
                            <Badge variant="secondary">
                              {suggestion.suggestion_type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">
                              Confidence: {(suggestion.confidence_score * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Rationale:</p>
                          <p className="text-sm text-muted-foreground">{suggestion.rationale}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Suggested Change:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {suggestion.suggested_prompt}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleApply(suggestion)}
                            disabled={applyingId === suggestion.id}
                          >
                            {applyingId === suggestion.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Apply
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'rejected' })}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="applied" className="space-y-4 mt-4">
                {applied.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No applied suggestions</p>
                ) : (
                  applied.map((suggestion) => (
                    <Card key={suggestion.id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <Badge variant="secondary">
                            {suggestion.suggestion_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{suggestion.rationale}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4 mt-4">
                {rejected.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No rejected suggestions</p>
                ) : (
                  rejected.map((suggestion) => (
                    <Card key={suggestion.id} className="opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <Badge variant="secondary">
                            {suggestion.suggestion_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{suggestion.rationale}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog?.open || false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply AI Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update your template based on AI analysis. A version history will be saved so you can rollback if needed.
              <br /><br />
              <strong>Change:</strong> {confirmDialog?.suggestion?.rationale}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApply}>
              Apply Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
