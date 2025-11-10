import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, ClipboardCheck, Briefcase, Brain, Zap, Layout, Wand2, RefreshCw, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SummaryRatingWidget } from "./SummaryRatingWidget";

interface AIMinutesGeneratorProps {
  meetingId: string;
}

export const AIMinutesGenerator = ({ meetingId }: AIMinutesGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<string>("");
  const [progressText, setProgressText] = useState("");
  const [generationMethod, setGenerationMethod] = useState<'standard' | 'template'>('standard');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [regenerateDialog, setRegenerateDialog] = useState(false);
  const [regenerateSummaryType, setRegenerateSummaryType] = useState<string>('');
  const [regenerateTemplateId, setRegenerateTemplateId] = useState<string>('');
  const { toast } = useToast();

  const progressSteps = [
    "Analyzing meeting content...",
    "Processing transcription...",
    "Identifying key points...",
    "Generating summary...",
    "Finalizing content..."
  ];

  useEffect(() => {
    if (!generating) return;
    
    let currentStep = 0;
    setProgressText(progressSteps[0]);
    
    const interval = setInterval(() => {
      currentStep = (currentStep + 1) % progressSteps.length;
      setProgressText(progressSteps[currentStep]);
    }, 2000);

    return () => clearInterval(interval);
  }, [generating]);

  const { data: summaries, refetch } = useQuery({
    queryKey: ['meeting-summaries', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_summaries')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('generated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: templates } = useQuery({
    queryKey: ['meeting-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const generateSummary = async (
    type: 'brief' | 'detailed' | 'executive' | 'action_items',
    overrideTemplateId?: string
  ) => {
    const effectiveMethod = overrideTemplateId ? 'template' : generationMethod;
    const effectiveTemplateId = overrideTemplateId || selectedTemplateId;

    // Validate template selection if using template method
    if (effectiveMethod === 'template' && !effectiveTemplateId) {
      toast({
        title: "Template required",
        description: "Please select a template for template-based generation",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setGeneratingType(type);
    
    try {
      console.log('Starting summary generation:', { type, effectiveMethod, effectiveTemplateId });

      const { data, error } = await supabase.functions.invoke('generate-summary-with-template', {
        body: { 
          meetingId,
          summaryType: type,
          templateId: effectiveMethod === 'template' ? effectiveTemplateId : null,
          generationMethod: effectiveMethod
        }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Summary generated",
        description: `${type.replace('_', ' ')} summary created successfully ${effectiveMethod === 'template' ? 'using template structure' : ''}`,
      });

      refetch();
    } catch (error: any) {
      console.error('Error generating summary:', error);
      
      let errorMessage = "Could not generate summary";
      if (error.message?.includes('Rate limit')) {
        errorMessage = "Rate limit exceeded. Please try again in a moment.";
      } else if (error.message?.includes('credits')) {
        errorMessage = "AI credits exhausted. Please add credits to continue.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const summaryTypes = [
    { type: 'brief' as const, label: 'Brief', icon: FileText, color: 'bg-blue-500' },
    { type: 'detailed' as const, label: 'Detailed', icon: FileText, color: 'bg-purple-500' },
    { type: 'executive' as const, label: 'Executive', icon: Briefcase, color: 'bg-amber-500' },
    { type: 'action_items' as const, label: 'Action Items', icon: ClipboardCheck, color: 'bg-green-500' }
  ];

  const handleRegenerateClick = (summaryType: string) => {
    setRegenerateSummaryType(summaryType);
    setRegenerateDialog(true);
  };

  const handleRegenerateConfirm = async () => {
    // Track regeneration in metrics
    const summary = summaries?.find(s => s.summary_type === regenerateSummaryType);
    if (summary) {
      await supabase
        .from('summary_quality_metrics')
        .update({ 
          was_regenerated: true,
          regeneration_reason: (regenerateTemplateId && regenerateTemplateId !== 'no-template') ? 'Changed to template' : 'Changed to standard'
        })
        .eq('summary_id', summary.id);
    }

    setRegenerateDialog(false);
    await generateSummary(
      regenerateSummaryType as 'brief' | 'detailed' | 'executive' | 'action_items',
      (regenerateTemplateId && regenerateTemplateId !== 'no-template') ? regenerateTemplateId : undefined
    );
  };

  const handleCopySummary = async (summaryId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    
    // Track copy action - get current count and increment
    const { data: metrics } = await supabase
      .from('summary_quality_metrics')
      .select('copy_count')
      .eq('summary_id', summaryId)
      .single();
    
    if (metrics) {
      await supabase
        .from('summary_quality_metrics')
        .update({ copy_count: (metrics.copy_count || 0) + 1 })
        .eq('summary_id', summaryId);
    }

    toast({
      title: "Copied",
      description: "Summary copied to clipboard"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Meeting Summaries
        </CardTitle>
        <CardDescription>
          Generate intelligent summaries and extract action items using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generation Method Selection */}
        <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
          <Label className="text-base font-semibold">Generation Method</Label>
          <RadioGroup value={generationMethod} onValueChange={(v) => setGenerationMethod(v as 'standard' | 'template')}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="standard" id="standard" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="standard" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Standard Generation
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  AI analyzes meeting content and generates summaries from scratch
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="template" id="template" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="template" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Layout className="h-4 w-4 text-primary" />
                  Use Template Structure
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Apply a pre-defined template to guide the AI generation
                </p>
              </div>
            </div>
          </RadioGroup>

          {generationMethod === 'template' && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="template-select">Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="template-select">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.category && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({template.category})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTemplateId && (
                <p className="text-xs text-muted-foreground">
                  Please select a template to proceed with template-based generation
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryTypes.map(({ type, label, icon: Icon, color }) => (
            <Button
              key={type}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => generateSummary(type)}
              disabled={generating || (generationMethod === 'template' && !selectedTemplateId)}
            >
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Button>
          ))}
        </div>

        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative py-12 px-6 overflow-hidden rounded-lg bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5"
            >
              {/* Animated background particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-primary/20 rounded-full"
                    initial={{
                      x: Math.random() * 100 + "%",
                      y: Math.random() * 100 + "%",
                    }}
                    animate={{
                      x: [
                        Math.random() * 100 + "%",
                        Math.random() * 100 + "%",
                        Math.random() * 100 + "%",
                      ],
                      y: [
                        Math.random() * 100 + "%",
                        Math.random() * 100 + "%",
                        Math.random() * 100 + "%",
                      ],
                      scale: [1, 1.5, 1],
                      opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>

              {/* Main content */}
              <div className="relative flex flex-col items-center gap-6">
                {/* Animated icons */}
                <div className="relative">
                  <motion.div
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Sparkles className="h-8 w-8 text-primary/30" />
                  </motion.div>
                  
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Brain className="h-12 w-12 text-primary" />
                  </motion.div>
                </div>

                {/* Progress text */}
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  >
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Generating {generatingType.replace('_', ' ')} summary
                    </h3>
                  </motion.div>
                  
                  <motion.p
                    key={progressText}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-muted-foreground"
                  >
                    {progressText}
                  </motion.p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-xs">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary via-purple-500 to-blue-500"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{
                        duration: 10,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {summaries && summaries.length > 0 && (
          <Tabs defaultValue={summaries[0]?.summary_type} className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              {summaryTypes.map(({ type, label }) => (
                <TabsTrigger key={type} value={type}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {summaryTypes.map(({ type }) => {
              const summary = summaries.find(s => s.summary_type === type);
              const metadata = (summary as any)?.metadata;
              const isTemplateGenerated = metadata?.generation_method === 'template';
              const metricsQuery = useQuery({
                queryKey: ['summary-metrics', summary?.id],
                queryFn: async () => {
                  if (!summary?.id) return null;
                  const { data } = await supabase
                    .from('summary_quality_metrics')
                    .select('*')
                    .eq('summary_id', summary.id)
                    .single();
                  return data;
                },
                enabled: !!summary?.id
              });
              
              return (
                <TabsContent key={type} value={type} className="space-y-4">
                  {summary ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">
                            {summary.model_used || 'AI Generated'}
                          </Badge>
                          {isTemplateGenerated && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Layout className="h-3 w-3" />
                              Template-based
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {new Date(summary.generated_at).toLocaleString()}
                          </span>
                          <SummaryRatingWidget 
                            summaryId={summary.id}
                            currentRating={metricsQuery.data?.user_rating}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopySummary(summary.id, summary.content)}
                            className="h-8 text-xs"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRegenerateClick(type)}
                            className="h-8 text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{summary.content}</p>
                      </div>
                      {summary.confidence_score && (
                        <div className="text-xs text-muted-foreground">
                          Confidence: {(summary.confidence_score * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No {type.replace('_', ' ')} summary generated yet</p>
                      <Button
                        variant="link"
                        onClick={() => generateSummary(type)}
                        className="mt-2"
                      >
                        Generate now
                      </Button>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Regenerate Dialog */}
        <Dialog open={regenerateDialog} onOpenChange={setRegenerateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate Summary</DialogTitle>
              <DialogDescription>
                Choose a template to regenerate this {regenerateSummaryType.replace('_', ' ')} summary, or generate without a template.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="regenerate-template">Template (Optional)</Label>
                <Select value={regenerateTemplateId} onValueChange={setRegenerateTemplateId}>
                  <SelectTrigger id="regenerate-template">
                    <SelectValue placeholder="Choose a template or leave blank for standard generation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-template">No template (Standard)</SelectItem>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.category && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({template.category})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {regenerateTemplateId && regenerateTemplateId !== 'no-template'
                    ? "The AI will use the selected template structure to guide the summary" 
                    : "The AI will generate a standard summary without template constraints"}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRegenerateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRegenerateConfirm}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};