import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, FileText, Calendar, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  order_index: number;
}

interface Template {
  id: string;
  name: string;
  meeting_type?: string;
  description?: string;
  sections: TemplateSection[];
  is_default: boolean;
}

interface TemplatePreviewDialogProps {
  open: boolean;
  template: Template | null;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
}

export function TemplatePreviewDialog({ 
  open, 
  template, 
  onOpenChange,
  onApply 
}: TemplatePreviewDialogProps) {
  if (!template) return null;

  const sortedSections = [...template.sections].sort((a, b) => a.order_index - b.order_index);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Template Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">{template.name}</h3>
              {template.is_default && (
                <Badge variant="secondary">Default</Badge>
              )}
            </div>
            
            {template.meeting_type && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Meeting Type: {template.meeting_type}</span>
              </div>
            )}
            
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
          </div>

          <Separator />

          {/* Template Sections */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-foreground">Template Structure</h4>
              <Badge variant="outline" className="ml-auto">
                {sortedSections.length} sections
              </Badge>
            </div>

            <div className="space-y-3">
              {sortedSections.map((section, index) => (
                <div 
                  key={section.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {section.required ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <h5 className="font-medium text-foreground">{section.title}</h5>
                      {section.required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                    </div>
                    
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {sortedSections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No sections defined in this template</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            onApply();
            onOpenChange(false);
          }}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
