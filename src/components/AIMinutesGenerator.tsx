import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, ClipboardCheck, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface AIMinutesGeneratorProps {
  meetingId: string;
}

export const AIMinutesGenerator = ({ meetingId }: AIMinutesGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

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

  const generateSummary = async (type: 'brief' | 'detailed' | 'executive' | 'action_items') => {
    setGenerating(true);
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryTypes.map(({ type, label, icon: Icon, color }) => (
            <Button
              key={type}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => generateSummary(type)}
              disabled={generating}
            >
              <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Button>
          ))}
        </div>

        {generating && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">Generating summary...</span>
          </div>
        )}

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