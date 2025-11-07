import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Network, Trash2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface TaskDependencyManagerProps {
  taskId: string;
  onClose: () => void;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface Dependency {
  id: string;
  depends_on_task_id: string;
  dependency_type: string;
  task: Task;
}

export function TaskDependencyManager({ taskId, onClose }: TaskDependencyManagerProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<string>("blocking");
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDependencies();
    loadAvailableTasks();
    checkIfBlocked();

    const channel = supabase
      .channel('task-dependencies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guba_task_dependencies',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          loadDependencies();
          checkIfBlocked();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  const loadDependencies = async () => {
    const { data, error } = await supabase
      .from('guba_task_dependencies')
      .select(`
        id,
        depends_on_task_id,
        dependency_type,
        task:action_items!guba_task_dependencies_depends_on_task_id_fkey(
          id,
          title,
          status,
          priority
        )
      `)
      .eq('task_id', taskId);

    if (error) {
      console.error('Error loading dependencies:', error);
    } else {
      setDependencies(data as any || []);
    }
  };

  const loadAvailableTasks = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('action_items')
      .select('id, title, status, priority')
      .neq('id', taskId)
      .order('title');

    if (error) {
      console.error('Error loading tasks:', error);
    } else {
      setAvailableTasks(data || []);
    }
  };

  const checkIfBlocked = async () => {
    const { data, error } = await supabase.rpc('can_start_task', { p_task_id: taskId });
    
    if (error) {
      console.error('Error checking if blocked:', error);
    } else {
      setIsBlocked(!data);
    }
  };

  const addDependency = async () => {
    if (!selectedTaskId) {
      toast({
        title: "Error",
        description: "Please select a task",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('guba_task_dependencies' as any)
      .insert({
        task_id: taskId,
        depends_on_task_id: selectedTaskId,
        dependency_type: dependencyType,
        created_by: user.user?.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Dependency added successfully",
      });
      setSelectedTaskId("");
      loadDependencies();
      checkIfBlocked();
    }
    setLoading(false);
  };

  const removeDependency = async (dependencyId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('guba_task_dependencies' as any)
      .delete()
      .eq('id', dependencyId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Dependency removed successfully",
      });
      loadDependencies();
      checkIfBlocked();
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Manage Task Dependencies
          </DialogTitle>
        </DialogHeader>

        {isBlocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This task is blocked by incomplete dependencies and cannot be started.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Add New Dependency */}
          <div className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold">Add Dependency</h3>
            
            <div className="space-y-3">
              <div>
                <Label>Task depends on:</Label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dependency Type</Label>
                <RadioGroup value={dependencyType} onValueChange={setDependencyType}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="blocking" id="blocking" />
                    <Label htmlFor="blocking" className="flex items-center gap-2 font-normal cursor-pointer">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Blocking - Task cannot start until dependency completes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="informational" id="informational" />
                    <Label htmlFor="informational" className="flex items-center gap-2 font-normal cursor-pointer">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      Informational - Soft dependency for reference only
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={addDependency} disabled={loading || !selectedTaskId} className="w-full">
                Add Dependency
              </Button>
            </div>
          </div>

          {/* Current Dependencies */}
          <div className="space-y-3">
            <h3 className="font-semibold">Current Dependencies ({dependencies.length})</h3>
            
            {dependencies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No dependencies yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {dep.dependency_type === 'blocking' ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Info className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{dep.task.title}</span>
                        {dep.task.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge className={getStatusColor(dep.task.status)} variant="outline">
                          {dep.task.status}
                        </Badge>
                        <Badge className={getPriorityColor(dep.task.priority)} variant="outline">
                          {dep.task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {dep.dependency_type}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDependency(dep.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
