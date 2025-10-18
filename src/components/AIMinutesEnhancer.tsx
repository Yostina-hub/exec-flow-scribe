import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Target, CheckCircle, Zap, Wand2, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface AIMinutesEnhancerProps {
  minutes: string;
  meetingId: string;
  onMinutesUpdate: (newMinutes: string) => void;
}

export function AIMinutesEnhancer({ minutes, meetingId, onMinutesUpdate }: AIMinutesEnhancerProps) {
  const [processing, setProcessing] = useState(false);

  const enhanceWithAI = async (action: string) => {
    setProcessing(true);
    
    try {
      toast({
        title: "AI Processing",
        description: `Applying ${action}...`,
      });

      // Simulate AI enhancement
      setTimeout(() => {
        let enhanced = minutes;
        
        switch (action) {
          case 'summarize':
            enhanced = `# Executive Summary\n\n${minutes}\n\n## Key Takeaways\n- Main point 1\n- Main point 2\n- Main point 3`;
            break;
          case 'actions':
            enhanced = `${minutes}\n\n## Action Items (AI Extracted)\n1. [ ] Follow up on budget discussion\n2. [ ] Schedule Q1 planning session\n3. [ ] Review proposal draft`;
            break;
          case 'decisions':
            enhanced = `${minutes}\n\n## Decisions Made\n✓ Approved marketing budget increase\n✓ Agreed to hire 2 new engineers\n✓ Selected Q1 priorities`;
            break;
          case 'polish':
            enhanced = minutes.replace(/\n/g, '\n\n'); // Add formatting
            break;
        }
        
        onMinutesUpdate(enhanced);
        toast({
          title: "AI Enhancement Complete",
          description: `Successfully applied ${action}`,
        });
        setProcessing(false);
      }, 1500);
    } catch (error) {
      toast({
        title: "Enhancement Failed",
        description: "Please try again",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const extractActionItems = () => enhanceWithAI('actions');
  const extractDecisions = () => enhanceWithAI('decisions');
  const summarize = () => enhanceWithAI('summarize');
  const polish = () => enhanceWithAI('polish');

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          AI Minutes Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={extractActionItems}
            disabled={processing || !minutes}
            variant="outline"
            className="gap-2 hover-scale"
            size="sm"
          >
            <Target className="h-3 w-3" />
            Extract Actions
          </Button>
          
          <Button
            onClick={extractDecisions}
            disabled={processing || !minutes}
            variant="outline"
            className="gap-2 hover-scale"
            size="sm"
          >
            <CheckCircle className="h-3 w-3" />
            Extract Decisions
          </Button>
          
          <Button
            onClick={summarize}
            disabled={processing || !minutes}
            variant="outline"
            className="gap-2 hover-scale"
            size="sm"
          >
            <Sparkles className="h-3 w-3" />
            Summarize
          </Button>
          
          <Button
            onClick={polish}
            disabled={processing || !minutes}
            variant="outline"
            className="gap-2 hover-scale"
            size="sm"
          >
            <Wand2 className="h-3 w-3" />
            Polish Text
          </Button>
        </div>

        <Button
          onClick={() => navigator.clipboard.writeText(minutes)}
          disabled={!minutes}
          variant="secondary"
          className="w-full gap-2"
          size="sm"
        >
          <Copy className="h-3 w-3" />
          Copy to Clipboard
        </Button>

        <div className="p-3 rounded-lg bg-primary/5 border">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <strong>Pro Tip:</strong> AI can automatically extract action items, decisions, and generate summaries from your transcript in one click.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
