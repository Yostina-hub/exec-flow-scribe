import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface AgendaItem {
  title: string;
  description: string;
  duration_minutes: number;
  order_index: number;
}

interface AgendaIntakeFormProps {
  meetingId: string;
  trigger?: React.ReactNode;
}

export const AgendaIntakeForm = ({ meetingId, trigger }: AgendaIntakeFormProps) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AgendaItem[]>([
    { title: '', description: '', duration_minutes: 15, order_index: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addItem = () => {
    setItems([
      ...items,
      {
        title: '',
        description: '',
        duration_minutes: 15,
        order_index: items.length,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof AgendaItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validItems = items.filter((item) => item.title.trim() !== '');

      if (validItems.length === 0) {
        toast({
          title: 'No items to submit',
          description: 'Please add at least one agenda item',
          variant: 'destructive',
        });
        return;
      }

      const itemsWithMeeting = validItems.map((item, index) => ({
        ...item,
        meeting_id: meetingId,
        order_index: index,
        status: 'pending' as const,
      }));

      const { error } = await supabase.from('agenda_items').insert(itemsWithMeeting);

      if (error) throw error;

      toast({
        title: 'Agenda submitted',
        description: `${validItems.length} item(s) added to meeting agenda`,
      });

      setOpen(false);
      setItems([{ title: '', description: '', duration_minutes: 15, order_index: 0 }]);
    } catch (error: any) {
      console.error('Error submitting agenda:', error);
      toast({
        title: 'Submission failed',
        description: error.message || 'Could not save agenda items',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalDuration = items.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Agenda Items
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting Agenda Intake</DialogTitle>
          <DialogDescription>
            Prepare the meeting agenda by adding discussion topics and time allocations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h4 className="text-sm font-semibold">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`title-${index}`}>Topic Title *</Label>
                      <Input
                        id={`title-${index}`}
                        value={item.title}
                        onChange={(e) => updateItem(index, 'title', e.target.value)}
                        placeholder="e.g., Q4 Performance Review"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <Textarea
                        id={`description-${index}`}
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Additional context or discussion points..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`duration-${index}`}>Duration (minutes)</Label>
                      <Input
                        id={`duration-${index}`}
                        type="number"
                        min="5"
                        step="5"
                        value={item.duration_minutes}
                        onChange={(e) =>
                          updateItem(index, 'duration_minutes', parseInt(e.target.value) || 15)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addItem} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Another Item
          </Button>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total estimated duration: <span className="font-semibold">{totalDuration} minutes</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Agenda'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
