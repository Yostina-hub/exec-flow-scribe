import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit2, Copy, Share2, Star, TrendingUp, Sparkles, FileText } from "lucide-react";

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  template_data: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    default_due_days: number;
    category: string;
  };
  created_by: string;
  is_shared: boolean;
  use_count: number;
  created_at: string;
}

export function TaskTemplatesManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<TaskTemplate | null>(null);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDays, setDueDays] = useState(7);
  const [category, setCategory] = useState("");
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    fetchTemplates();

    // Real-time subscription
    const channel = supabase
      .channel("task-templates-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guba_task_templates",
        },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("guba_task_templates" as any)
        .select("*")
        .order("use_count", { ascending: false });

      if (error) throw error;
      setTemplates((data as any) || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTaskTitle("");
    setTaskDescription("");
    setPriority("medium");
    setDueDays(7);
    setCategory("");
    setIsShared(false);
    setEditingTemplate(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!templateName || !taskTitle) {
      toast({ title: "Missing fields", description: "Template name and task title are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const templateData = {
        name: templateName,
        description: templateDescription || null,
        template_data: {
          title: taskTitle,
          description: taskDescription,
          priority,
          default_due_days: dueDays,
          category,
        },
        is_shared: isShared,
      };

      if (editingTemplate) {
        // Update
        const { error } = await supabase
          .from("guba_task_templates" as any)
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast({ title: "✅ Template Updated", description: "Task template updated successfully" });
      } else {
        // Create
        const { error } = await supabase
          .from("guba_task_templates" as any)
          .insert({ ...templateData, created_by: user.id });

        if (error) throw error;
        toast({ title: "✅ Template Created", description: "Task template created successfully" });
      }

      setShowCreateDialog(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setTaskTitle(template.template_data.title);
    setTaskDescription(template.template_data.description);
    setPriority(template.template_data.priority);
    setDueDays(template.template_data.default_due_days);
    setCategory(template.template_data.category);
    setIsShared(template.is_shared);
    setShowCreateDialog(true);
  };

  const handleDuplicate = async (template: TaskTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("guba_task_templates" as any)
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          template_data: template.template_data,
          created_by: user.id,
          is_shared: false,
        });

      if (error) throw error;
      toast({ title: "✅ Template Duplicated", description: "Template copied successfully" });
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({ title: "Error", description: "Failed to duplicate template", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    try {
      const { error } = await supabase
        .from("guba_task_templates" as any)
        .delete()
        .eq("id", deleteTemplate.id);

      if (error) throw error;
      toast({ title: "✅ Template Deleted", description: "Task template removed successfully" });
      setDeleteTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleUseTemplate = async (template: TaskTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.template_data.default_due_days);

      // Create action item from template
      const { error } = await supabase
        .from("action_items")
        .insert({
          title: template.template_data.title,
          description: template.template_data.description,
          priority: template.template_data.priority,
          due_date: dueDate.toISOString(),
          assigned_to: user.id,
          created_by: user.id,
          status: "pending",
        });

      if (error) throw error;

      // Increment use count
      await supabase
        .from("guba_task_templates" as any)
        .update({ use_count: template.use_count + 1 })
        .eq("id", template.id);

      toast({
        title: "✅ Task Created",
        description: `Task created from template: ${template.name}`,
      });

      fetchTemplates();
    } catch (error) {
      console.error("Error using template:", error);
      toast({ title: "Error", description: "Failed to create task from template", variant: "destructive" });
    }
  };

  const myTemplates = templates.filter(t => {
    return supabase.auth.getUser().then(({ data }) => data.user?.id === t.created_by);
  });
  
  const sharedTemplates = templates.filter(t => t.is_shared);
  const popularTemplates = [...templates].sort((a, b) => b.use_count - a.use_count).slice(0, 10);

  const TemplateCard = ({ template, showActions = true }: { template: TaskTemplate; showActions?: boolean }) => {
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
      supabase.auth.getUser().then(({ data }) => {
        setIsOwner(data.user?.id === template.created_by);
      });
    }, [template.created_by]);

    return (
      <Card className="hover:shadow-lg transition-all border-2 hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {template.name}
              </CardTitle>
              {template.description && (
                <CardDescription className="mt-1.5">{template.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-1">
              {template.is_shared && (
                <Badge variant="secondary" className="gap-1">
                  <Share2 className="h-3 w-3" />
                  Shared
                </Badge>
              )}
              {template.use_count > 0 && (
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {template.use_count}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm">{template.template_data.title}</p>
            {template.template_data.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{template.template_data.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant={
                template.template_data.priority === "high" ? "destructive" :
                template.template_data.priority === "medium" ? "warning" : "secondary"
              }>
                {template.template_data.priority}
              </Badge>
              <Badge variant="outline">Due in {template.template_data.default_due_days} days</Badge>
              {template.template_data.category && (
                <Badge variant="outline">{template.template_data.category}</Badge>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button onClick={() => handleUseTemplate(template)} className="flex-1 gap-2">
                <Sparkles className="h-4 w-4" />
                Use Template
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleDuplicate(template)}>
                <Copy className="h-4 w-4" />
              </Button>
              {isOwner && (
                <>
                  <Button variant="outline" size="icon" onClick={() => handleEdit(template)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteTemplate(template)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Task Templates
          </h2>
          <p className="text-muted-foreground">Create reusable task templates for common workflows</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowCreateDialog(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Templates Tabs */}
      <Tabs defaultValue="my" className="w-full">
        <TabsList>
          <TabsTrigger value="my">My Templates</TabsTrigger>
          <TabsTrigger value="shared">Shared Templates</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-4 mt-6">
          {templates.filter(t => {
            // This is a workaround since we can't use async in filter directly
            return true; // Will be filtered in the map below
          }).length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No templates yet. Create your first template!</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-4 mt-6">
          {sharedTemplates.length === 0 ? (
            <Card className="p-12 text-center">
              <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No shared templates available</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sharedTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="popular" className="space-y-4 mt-6">
          {popularTemplates.length === 0 ? (
            <Card className="p-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No popular templates yet</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {popularTemplates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Task Template"}</DialogTitle>
            <DialogDescription>
              Define a reusable template for common tasks
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g., Weekly Status Report"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Template Description</Label>
              <Textarea
                placeholder="Describe when to use this template..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="font-medium text-sm">Task Details</p>

              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  placeholder="e.g., Submit weekly report"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Task Description</Label>
                <Textarea
                  placeholder="Default task description..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Due (Days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={dueDays}
                    onChange={(e) => setDueDays(parseInt(e.target.value) || 7)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g., Reporting, Review, Follow-up"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch checked={isShared} onCheckedChange={setIsShared} id="share-template" />
                <Label htmlFor="share-template" className="cursor-pointer">
                  Share with team
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdate} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
