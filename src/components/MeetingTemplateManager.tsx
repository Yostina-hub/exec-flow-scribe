import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Copy } from "lucide-react";

interface MeetingTemplate {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  default_agenda: any;
  meeting_settings: any;
  is_public: boolean;
  created_at: string;
}

interface MeetingTemplateManagerProps {
  onApplyTemplate?: (template: MeetingTemplate) => void;
}

export function MeetingTemplateManager({ onApplyTemplate }: MeetingTemplateManagerProps) {
  const [templates, setTemplates] = useState<MeetingTemplate[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [agenda, setAgenda] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("meeting_templates")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      return;
    }

    setTemplates(data || []);
  };

  const createTemplate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const agendaItems = agenda.split("\n").filter((line) => line.trim()).map((line, index) => ({
      title: line.trim(),
      order_index: index,
      duration_minutes: 10,
    }));

    const { error } = await supabase
      .from("meeting_templates")
      .insert({
        name: templateName,
        description,
        duration_minutes: duration,
        default_agenda: agendaItems,
        meeting_settings: {
          auto_record: false,
          require_consent: true,
          enable_breakout_rooms: false,
        },
        created_by: user.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Template created successfully",
    });

    setIsCreateOpen(false);
    setTemplateName("");
    setDescription("");
    setDuration(60);
    setAgenda("");
    fetchTemplates();
  };

  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from("meeting_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Template deleted",
    });

    fetchTemplates();
  };

  const applyTemplate = (template: MeetingTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
    }
    toast({
      title: "Template Applied",
      description: `Using template: ${template.name}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Meeting Templates
            </CardTitle>
            <CardDescription>
              Save and reuse meeting configurations
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Meeting Template</DialogTitle>
                <DialogDescription>
                  Save a template for recurring meeting types
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Weekly Team Sync"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Regular team meeting to discuss progress..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Default Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agenda">Agenda Items (one per line)</Label>
                  <Textarea
                    id="agenda"
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    placeholder="Welcome and introductions&#10;Progress updates&#10;Blockers discussion&#10;Action items review"
                    rows={6}
                  />
                </div>
                <Button onClick={createTemplate} className="w-full">
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No templates yet. Create your first template to get started.
              </p>
            )}
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{template.duration_minutes} min</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.default_agenda && Array.isArray(template.default_agenda) && template.default_agenda.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-2">Agenda:</p>
                      <div className="space-y-1">
                        {template.default_agenda.slice(0, 3).map((item: any, idx: number) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            • {item.title}
                          </p>
                        ))}
                        {template.default_agenda.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            + {template.default_agenda.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applyTemplate(template)}
                      className="flex-1"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Use Template
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
