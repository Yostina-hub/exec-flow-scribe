import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, ClipboardCheck, Briefcase, Brain, Zap, Layout, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AIMinutesGeneratorProps {
  meetingId: string;
}

export const AIMinutesGenerator = ({ meetingId }: AIMinutesGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<string>("");
  const [progressText, setProgressText] = useState("");
  const [generationMethod, setGenerationMethod] = useState<'standard' | 'template'>('standard');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
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

  const generateSummary = async (type: 'brief' | 'detailed' | 'executive' | 'action_items') => {
    setGenerating(true);
    setGeneratingType(type);
    try {
      // Get meeting transcription and details
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*, transcriptions(*)')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      const transcription = meeting.transcriptions?.[0];
      if (!transcription) {
        toast({
          title: "No transcription available",
          description: "Please transcribe the meeting first",
          variant: "destructive"
        });
        return;
      }

      // Call AI to generate summary (placeholder - would call edge function)
      const prompt = `Generate a ${type} summary for this meeting:\n${transcription.content}`;
      
      // Mock AI response for now
      const mockContent = {
        brief: "Quick overview of key discussion points and decisions made during the meeting.",
        detailed: "Comprehensive summary including all topics discussed, decisions made, and action items identified. Includes context and rationale for major decisions.",
        executive: "High-level executive summary focusing on strategic decisions, risks, and key outcomes that require leadership attention.",
        action_items: "• Complete Q4 financial projections\n• Finalize hiring plan for 2025\n• Schedule follow-up meeting with stakeholders"
      };

      const { error: insertError } = await supabase
        .from('meeting_summaries')
        .insert({
          meeting_id: meetingId,
          summary_type: type,
          content: mockContent[type],
          model_used: 'google/gemini-2.5-flash',
          confidence_score: 0.92
        });

      if (insertError) throw insertError;

      toast({
        title: "Summary generated",
        description: `${type.replace('_', ' ')} summary created successfully`
      });

      refetch();
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate summary",
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
              return (
                <TabsContent key={type} value={type} className="space-y-4">
                  {summary ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {summary.model_used || 'AI Generated'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(summary.generated_at).toLocaleString()}
                        </span>
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
      </CardContent>
    </Card>
  );
};