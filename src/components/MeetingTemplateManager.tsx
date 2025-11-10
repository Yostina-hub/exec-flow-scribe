import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, FileText, Star, Download, Upload, Sparkles } from 'lucide-react';
import { TemplateImprovementPanel } from './TemplateImprovementPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface TemplateSection {
  id: string;
  name: string;
  required: boolean;
  order: number;
}

interface Template {
  id: string;
  name: string;
  meeting_type: string;
  description: string | null;
  sections: TemplateSection[];
  is_default: boolean;
  created_at: string;
  created_by?: string;
}

const MEETING_TYPES = [
  'Board Meeting',
  'Team Meeting',
  'Executive Meeting',
  'Strategic Planning',
  'Operations Review',
  'Project Review',
  'One-on-One',
];

const DEFAULT_SECTIONS = [
  { id: 'meeting_info', name: 'Meeting Information', required: true, order: 1 },
  { id: 'opening_remarks', name: 'Opening Remarks', required: true, order: 2 },
  { id: 'executive_summary', name: 'Executive Summary', required: true, order: 3 },
  { id: 'discussion_points', name: 'Discussion Points', required: true, order: 4 },
  { id: 'decisions', name: 'Decisions Made', required: false, order: 5 },
  { id: 'action_items', name: 'Action Items', required: false, order: 6 },
  { id: 'next_steps', name: 'Next Steps', required: false, order: 7 },
];

export const MeetingTemplateManager = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showImprovements, setShowImprovements] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['meeting-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_templates')
        .select('*')
        .order('meeting_type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as any) as Template[];
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (template: Partial<Template>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('meeting_templates')
        .insert([{ ...template, created_by: user.id } as any])
        .select()
        .single();

      if (error) throw error;
      return data as any as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      toast({
        title: 'Template created',
        description: 'Meeting template has been created successfully.',
      });
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Template> & { id: string }) => {
      const { data, error } = await supabase
        .from('meeting_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      toast({
        title: 'Template updated',
        description: 'Meeting template has been updated successfully.',
      });
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meeting_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      toast({
        title: 'Template deleted',
        description: 'Meeting template has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleExportTemplate = (template: Template) => {
    const exportData = {
      name: template.name,
      meeting_type: template.meeting_type,
      description: template.description,
      sections: template.sections,
      exported_at: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Template exported',
      description: 'Template has been downloaded successfully.',
    });
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = handleFileSelect;
    input.click();
  };

  const handleFileSelect = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate template structure
      if (!data.name || !data.sections || !Array.isArray(data.sections)) {
        throw new Error('Invalid template format. Missing required fields.');
      }

      // Validate sections structure
      if (!data.sections.every((s: any) => s.id && s.name && typeof s.required === 'boolean')) {
        throw new Error('Invalid sections format.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Import the template
      const { error } = await supabase
        .from('meeting_templates')
        .insert({
          name: data.name,
          meeting_type: data.meeting_type || 'Board Meeting',
          description: data.description || '',
          sections: data.sections,
          is_default: false,
          created_by: user.id,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['meeting-templates'] });
      
      toast({
        title: 'Template imported',
        description: `"${data.name}" has been imported successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to import template. Please check the file format.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meeting Templates</h2>
          <p className="text-sm text-muted-foreground">
            Manage templates for different meeting types with customized sections
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportClick} className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Meeting Template</DialogTitle>
              </DialogHeader>
              <TemplateForm
                onSubmit={(data) => createTemplateMutation.mutate(data)}
                isLoading={createTemplateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-6 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map((template) => (
            <div key={template.id} className="space-y-4">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{template.name}</h3>
                        {template.is_default && (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowImprovements(showImprovements === template.id ? null : template.id)}
                      title="AI Improvements"
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportTemplate(template)}
                      title="Export template"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Dialog
                      open={editingTemplate?.id === template.id}
                      onOpenChange={(open) => !open && setEditingTemplate(null)}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Template</DialogTitle>
                        </DialogHeader>
                        <TemplateForm
                          template={template}
                          onSubmit={(data) =>
                            updateTemplateMutation.mutate({ id: template.id, ...data })
                          }
                          isLoading={updateTemplateMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    {!template.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Badge variant="secondary">{template.meeting_type}</Badge>
                  <div className="text-sm text-muted-foreground">
                    {template.sections.length} sections
                  </div>
                </div>
              </Card>
              
              {showImprovements === template.id && (
                <TemplateImprovementPanel templateId={template.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface TemplateFormProps {
  template?: Template;
  onSubmit: (data: Partial<Template>) => void;
  isLoading: boolean;
}

const TemplateForm = ({ template, onSubmit, isLoading }: TemplateFormProps) => {
  const [name, setName] = useState(template?.name || '');
  const [meetingType, setMeetingType] = useState(template?.meeting_type || '');
  const [description, setDescription] = useState(template?.description || '');
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.sections || DEFAULT_SECTIONS
  );
  const [newSectionName, setNewSectionName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      meeting_type: meetingType,
      description,
      sections,
    });
  };

  const addSection = () => {
    if (!newSectionName.trim()) return;
    const newSection: TemplateSection = {
      id: newSectionName.toLowerCase().replace(/\s+/g, '_'),
      name: newSectionName,
      required: false,
      order: sections.length + 1,
    };
    setSections([...sections, newSection]);
    setNewSectionName('');
  };

  const removeSection = (id: string) => {
    setSections(sections.filter((s) => s.id !== id));
  };

  const toggleRequired = (id: string) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, required: !s.required } : s))
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Board Meeting Template"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Meeting Type</Label>
        <Select value={meetingType} onValueChange={setMeetingType} required>
          <SelectTrigger>
            <SelectValue placeholder="Select meeting type" />
          </SelectTrigger>
          <SelectContent>
            {MEETING_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of when to use this template"
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label>Template Sections</Label>
        <div className="space-y-2">
          {sections.map((section) => (
            <div
              key={section.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{section.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={section.required}
                  onCheckedChange={() => toggleRequired(section.id)}
                />
                <Label className="text-xs">Required</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSection(section.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Add new section..."
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSection())}
          />
          <Button type="button" onClick={addSection} variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </form>
  );
};
