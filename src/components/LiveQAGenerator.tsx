import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageCircleQuestion, Send, Loader2, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Question {
  id: string;
  question: string;
  generated_at: string;
  answered_by?: string;
  answer?: string;
  answered_at?: string;
  profiles?: {
    full_name: string;
  };
}

interface LiveQAGeneratorProps {
  meetingId: string;
}

export function LiveQAGenerator({ meetingId }: LiveQAGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});
  const [submittingAnswers, setSubmittingAnswers] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadQuestions();

    // Set up realtime subscription
    const channel = supabase
      .channel('meeting_questions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_questions',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          loadQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_questions')
        .select(`
          *,
          profiles:answered_by (
            full_name
          )
        `)
        .eq('meeting_id', meetingId)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setQuestions((data || []) as Question[]);
    } catch (error: any) {
      console.error('Error loading questions:', error);
    }
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-live-questions', {
        body: { meetingId }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Questions Generated',
        description: `${data.questions.length} intelligent questions generated from the discussion`,
      });
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate questions',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const submitAnswer = async (questionId: string) => {
    const answer = answerText[questionId]?.trim();
    if (!answer) return;

    setSubmittingAnswers({ ...submittingAnswers, [questionId]: true });
    try {
      const { error } = await supabase
        .from('meeting_questions')
        .update({
          answer,
          answered_by: user?.id,
          answered_at: new Date().toISOString(),
        })
        .eq('id', questionId);

      if (error) throw error;

      setAnswerText({ ...answerText, [questionId]: '' });
      toast({
        title: 'Answer Submitted',
        description: 'Your answer has been recorded',
      });
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit answer',
        variant: 'destructive',
      });
    } finally {
      setSubmittingAnswers({ ...submittingAnswers, [questionId]: false });
    }
  };

  const unanswered = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);

  return (
    <Card className="border-2 border-blue-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-blue-600" />
            Live Q&A
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateQuestions}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Questions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Unanswered Questions */}
            {unanswered.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Pending Questions ({unanswered.length})
                </h3>
                {unanswered.map((q) => (
                  <Card key={q.id} className="border-yellow-500/30">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm font-medium">{q.question}</p>
                      <p className="text-xs text-muted-foreground">
                        Generated {new Date(q.generated_at).toLocaleTimeString()}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your answer..."
                          value={answerText[q.id] || ''}
                          onChange={(e) =>
                            setAnswerText({ ...answerText, [q.id]: e.target.value })
                          }
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') submitAnswer(q.id);
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => submitAnswer(q.id)}
                          disabled={
                            !answerText[q.id]?.trim() || submittingAnswers[q.id]
                          }
                        >
                          {submittingAnswers[q.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Answered Questions */}
            {answered.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Answered Questions ({answered.length})
                </h3>
                {answered.map((q) => (
                  <Card key={q.id} className="border-green-500/30 bg-green-50 dark:bg-green-900/10">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="bg-background p-3 rounded-md">
                        <p className="text-sm mb-2">{q.answer}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {q.profiles?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{q.profiles?.full_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(q.answered_at!).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {questions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircleQuestion className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No questions generated yet</p>
                <p className="text-xs mt-1">Generate intelligent questions from the discussion</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
