import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface StudyGuideGeneratorProps {
  sourceIds: string[];
}

export const StudyGuideGenerator = ({ sourceIds }: StudyGuideGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyGuide, setStudyGuide] = useState<string>("");
  const { toast } = useToast();

  const generateStudyGuide = async () => {
    if (sourceIds.length === 0) {
      toast({
        title: "No sources selected",
        description: "Please select at least one source",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-guide', {
        body: { sourceIds }
      });

      if (error) throw error;

      setStudyGuide(data.studyGuide);
      toast({
        title: "Study Guide Generated!",
        description: `Created from ${data.sourceCount} sources`,
      });
    } catch (error) {
      console.error('Error generating study guide:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate study guide",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Study Guide</h3>
        </div>
        <Button 
          onClick={generateStudyGuide} 
          disabled={isGenerating || sourceIds.length === 0}
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Study Guide"
          )}
        </Button>
      </div>

      {!studyGuide ? (
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          <p>Select sources and click "Generate Study Guide" to create structured study materials</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
            <ReactMarkdown>{studyGuide}</ReactMarkdown>
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};
