import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Plus, Trash2 } from 'lucide-react';

interface SensitiveSection {
  id: string;
  section_type: string;
  section_content: string;
  sensitivity_level: string;
  requires_countersignature: boolean;
  redacted_for_distribution: boolean;
}

interface SensitiveSectionManagerProps {
  meetingId: string;
  sections: SensitiveSection[];
  onUpdate: () => void;
}

export function SensitiveSectionManager({ meetingId, sections, onUpdate }: SensitiveSectionManagerProps) {
  const { toast } = useToast();
  const [newSection, setNewSection] = useState({
    section_type: 'general',
    section_content: '',
    sensitivity_level: 'standard',
    requires_countersignature: false,
    redacted_for_distribution: false,
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!newSection.section_content.trim()) {
        toast({ title: 'Error', description: 'Section content is required', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('section_sensitivities').insert({
        meeting_id: meetingId,
        created_by: user.id,
        ...newSection,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Sensitive section added' });
      setNewSection({
        section_type: 'general',
        section_content: '',
        sensitivity_level: 'standard',
        requires_countersignature: false,
        redacted_for_distribution: false,
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error adding section:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from('section_sensitivities')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Section deleted' });
      onUpdate();
    } catch (error: any) {
      console.error('Error deleting section:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const sensitivityColors = {
    standard: 'bg-blue-500',
    confidential: 'bg-orange-500',
    restricted: 'bg-red-500',
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Sensitive Sections</h3>
      </div>

      {/* Existing Sections */}
      {sections.length > 0 && (
        <div className="space-y-3 mb-6">
          {sections.map((section) => (
            <Card key={section.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex gap-2">
                  <Badge variant="secondary">{section.section_type.toUpperCase()}</Badge>
                  <Badge className={`${sensitivityColors[section.sensitivity_level as keyof typeof sensitivityColors]} text-white`}>
                    {section.sensitivity_level}
                  </Badge>
                  {section.requires_countersignature && (
                    <Badge variant="outline">Requires Countersignature</Badge>
                  )}
                  {section.redacted_for_distribution && (
                    <Badge variant="outline">Redacted</Badge>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteSection(section.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{section.section_content}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Section */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Sensitive Section
        </h4>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Section Type</Label>
            <Select
              value={newSection.section_type}
              onValueChange={(value) => setNewSection({ ...newSection, section_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hr">HR / Personnel</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="ma">M&A / Strategic</SelectItem>
                <SelectItem value="strategic">Strategic Planning</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sensitivity Level</Label>
            <Select
              value={newSection.sensitivity_level}
              onValueChange={(value) => setNewSection({ ...newSection, sensitivity_level: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Section Content</Label>
            <Textarea
              value={newSection.section_content}
              onChange={(e) => setNewSection({ ...newSection, section_content: e.target.value })}
              placeholder="Describe the sensitive content or reference..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={newSection.requires_countersignature}
                onCheckedChange={(checked) => setNewSection({ ...newSection, requires_countersignature: checked })}
              />
              <Label>Requires Countersignature</Label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={newSection.redacted_for_distribution}
                onCheckedChange={(checked) => setNewSection({ ...newSection, redacted_for_distribution: checked })}
              />
              <Label>Redacted for Distribution</Label>
            </div>
          </div>

          <Button onClick={handleAddSection} disabled={isAdding} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>
    </Card>
  );
}
