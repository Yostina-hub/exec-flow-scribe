import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Workflow, Plus, Trash2, Play, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  is_active: boolean;
  actions: any[];
}

export function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowItem | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("meeting_completed");
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error: any) {
      console.error("Error loading workflows:", error);
      toast.error("Failed to load workflows");
    }
  };

  const saveWorkflow = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const workflowData = {
        user_id: user.id,
        name,
        description,
        trigger_type: triggerType,
        actions,
        is_active: true,
      };

      if (editingWorkflow) {
        const { error } = await supabase
          .from("workflows")
          .update(workflowData)
          .eq("id", editingWorkflow.id);

        if (error) throw error;
        toast.success("Workflow updated successfully");
      } else {
        const { error } = await supabase
          .from("workflows")
          .insert(workflowData);

        if (error) throw error;
        toast.success("Workflow created successfully");
      }

      setDialogOpen(false);
      resetForm();
      loadWorkflows();
    } catch (error: any) {
      console.error("Error saving workflow:", error);
      toast.error("Failed to save workflow");
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    try {
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Workflow deleted");
      loadWorkflows();
    } catch (error: any) {
      console.error("Error deleting workflow:", error);
      toast.error("Failed to delete workflow");
    }
  };

  const toggleWorkflow = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("workflows")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Workflow ${!isActive ? "activated" : "deactivated"}`);
      loadWorkflows();
    } catch (error: any) {
      console.error("Error toggling workflow:", error);
      toast.error("Failed to toggle workflow");
    }
  };

  const addAction = () => {
    setActions([
      ...actions,
      { type: "send_email", config: {} },
    ]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...actions];
    newActions[index] = {
      ...newActions[index],
      [field]: value,
    };
    setActions(newActions);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setTriggerType("meeting_completed");
    setActions([]);
    setEditingWorkflow(null);
  };

  const editWorkflow = (workflow: WorkflowItem) => {
    setEditingWorkflow(workflow);
    setName(workflow.name);
    setDescription(workflow.description);
    setTriggerType(workflow.trigger_type);
    setActions(workflow.actions || []);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Workflow Automation
            </CardTitle>
            <CardDescription>
              Create if-then automation rules for your meetings
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                New Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingWorkflow ? "Edit Workflow" : "Create New Workflow"}
                </DialogTitle>
                <DialogDescription>
                  Define trigger conditions and actions for automation
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Workflow Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Auto-send minutes after meeting"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Automatically send meeting minutes to all attendees"
                  />
                </div>

                <div>
                  <Label>Trigger</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting_completed">Meeting Completed</SelectItem>
                      <SelectItem value="meeting_created">Meeting Created</SelectItem>
                      <SelectItem value="action_created">Action Item Created</SelectItem>
                      <SelectItem value="action_overdue">Action Item Overdue</SelectItem>
                      <SelectItem value="action_completed">Action Item Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Actions</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addAction}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Action
                    </Button>
                  </div>

                  {actions.map((action, index) => (
                    <div key={index} className="flex gap-2 mb-2 p-3 border rounded-lg">
                      <Select
                        value={action.type}
                        onValueChange={(value) => updateAction(index, "type", value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="send_email">Send Email</SelectItem>
                          <SelectItem value="send_whatsapp">Send WhatsApp</SelectItem>
                          <SelectItem value="create_task">Create Task</SelectItem>
                          <SelectItem value="voice_call">Voice Call</SelectItem>
                          <SelectItem value="sync_crm">Sync to CRM</SelectItem>
                          <SelectItem value="upload_drive">Upload to Drive</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Action configuration (JSON)"
                        value={JSON.stringify(action.config || {})}
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value);
                            updateAction(index, "config", config);
                          } catch {}
                        }}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button onClick={saveWorkflow} disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingWorkflow ? "Update Workflow" : "Create Workflow"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No workflows yet. Create your first automation!
            </p>
          ) : (
            workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{workflow.name}</h4>
                    <Badge variant={workflow.is_active ? "default" : "secondary"}>
                      {workflow.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {workflow.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trigger: {workflow.trigger_type.replace(/_/g, " ")} • 
                    {workflow.actions?.length || 0} action(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={workflow.is_active}
                    onCheckedChange={() => toggleWorkflow(workflow.id, workflow.is_active)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editWorkflow(workflow)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}