import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, CheckCircle2, Brain, Calendar, Building2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface GubaTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggested_assignee_department: string;
  suggested_due_days: number;
  reasoning: string;
  confidence: number;
}

interface GubaTaskProposalsProps {
  meetingId: string;
  onTasksAccepted?: () => void;
}

export const GubaTaskProposals = ({ meetingId, onTasksAccepted }: GubaTaskProposalsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProposal();
  }, [meetingId]);

  const fetchProposal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guba_task_proposals')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setProposal(data);
      
      // Pre-select all tasks by default
      if (data?.generated_tasks) {
        const tasksData = data.generated_tasks as { tasks: GubaTask[] };
        if (tasksData.tasks) {
          setSelectedTasks(new Set(tasksData.tasks.map((t: GubaTask) => t.id)));
        }
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's Guba settings for language preference
      const { data: settings } = await supabase
        .from('guba_settings')
        .select('preferred_language')
        .eq('user_id', user.id)
        .maybeSingle();

      const language = settings?.preferred_language || 'en';

      const { data, error } = await supabase.functions.invoke('generate-guba-tasks', {
        body: {
          meeting_id: meetingId,
          source_type: 'minutes',
          language,
          user_id: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Tasks Generated! 🎉",
        description: `${data.tasks.length} actionable tasks created from meeting minutes`,
      });

      await fetchProposal();
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate tasks",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (selectedTasks.size === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to accept",
        variant: "destructive",
      });
      return;
    }

    setAccepting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tasksData = proposal.generated_tasks as { tasks: GubaTask[] };
      const tasks: GubaTask[] = tasksData.tasks.filter((t: GubaTask) => 
        selectedTasks.has(t.id)
      );

      // Get departments for assignment
      const { data: departments } = await supabase
        .from('departments')
        .select('*');

      // Create action items
      const actionItems = await Promise.all(
        tasks.map(async (task) => {
          // Find matching department
          const dept = departments?.find(d => 
            d.name === task.suggested_assignee_department ||
            d.name_am === task.suggested_assignee_department
          );

          // Get department head as assignee
          const assignee = dept?.head_user_id || user.id;

          return supabase.from('action_items').insert({
            title: task.title,
            description: task.description,
            meeting_id: meetingId,
            assigned_to: assignee,
            created_by: user.id,
            due_date: format(addDays(new Date(), task.suggested_due_days), 'yyyy-MM-dd'),
            priority: task.priority,
            status: 'pending',
            department_id: dept?.id,
            source_proposal_id: proposal.id,
            ai_generated: true,
            confidence_score: task.confidence
          });
        })
      );

      const errors = actionItems.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error('Failed to create some tasks');
      }

      // Update proposal status
      await supabase
        .from('guba_task_proposals')
        .update({ 
          status: 'accepted',
          selected_task_ids: Array.from(selectedTasks)
        })
        .eq('id', proposal.id);

      toast({
        title: "Tasks Created! ✅",
        description: `${selectedTasks.size} tasks have been added to your action items`,
      });

      setProposal(null);
      onTasksAccepted?.();
    } catch (error) {
      console.error('Error accepting tasks:', error);
      toast({
        title: "Failed to create tasks",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const toggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const priorityColors = {
    high: "destructive",
    medium: "warning",
    low: "secondary"
  } as const;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!proposal) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Task Generation
          </CardTitle>
          <CardDescription>
            Let AI analyze your meeting and generate actionable tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleGenerate} 
            disabled={generating}
            className="w-full gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing Meeting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Tasks from Minutes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tasksData = proposal.generated_tasks as { tasks: GubaTask[] };
  const tasks: GubaTask[] = tasksData?.tasks || [];

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI Generated Tasks ({tasks.length})
            </CardTitle>
            <CardDescription>
              Select tasks to add to your action items • {selectedTasks.size} selected
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setProposal(null)}
            >
              Regenerate
            </Button>
            <Button 
              onClick={handleAccept} 
              disabled={accepting || selectedTasks.size === 0}
              className="gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Accept Selected
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <Card 
            key={task.id} 
            className={`transition-all ${selectedTasks.has(task.id) ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={selectedTasks.has(task.id)}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-base mb-1">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {task.suggested_assignee_department}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      Due in {task.suggested_due_days} days
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Brain className="h-3 w-3" />
                      {Math.round(task.confidence * 100)}% confident
                    </Badge>
                  </div>
                  {task.reasoning && (
                    <p className="text-xs text-muted-foreground italic">
                      💡 {task.reasoning}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};
