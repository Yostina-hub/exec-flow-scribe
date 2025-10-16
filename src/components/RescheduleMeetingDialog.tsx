import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RescheduleMeetingDialogProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RescheduleMeetingDialog = ({
  meetingId,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleMeetingDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open && meetingId) {
      fetchMeetingDetails();
    }
  }, [open, meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('title, start_time, end_time')
        .eq('id', meetingId)
        .single();

      if (error) throw error;

      if (data) {
        setMeetingTitle(data.title);
        const startDate = new Date(data.start_time);
        const endDate = new Date(data.end_time);
        setDate(startDate);
        setStartTime(format(startDate, 'HH:mm'));
        setDuration(Math.round((endDate.getTime() - startDate.getTime()) / 60000));
      }
    } catch (error: any) {
      console.error('Error fetching meeting:', error);
      toast({
        title: 'Error',
        description: 'Could not load meeting details',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !startTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select both date and time',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const [hours, minutes] = startTime.split(':');
      const newStartTime = new Date(date);
      newStartTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const newEndTime = new Date(newStartTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + duration);

      // Validate that date is not in the past
      const now = new Date();
      if (newStartTime < now) {
        toast({
          title: 'Invalid Date',
          description: 'Cannot reschedule to a past date and time',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('meetings')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      if (error) throw error;

      toast({
        title: 'Meeting Rescheduled',
        description: `New time: ${format(newStartTime, 'PPp')}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error rescheduling meeting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not reschedule meeting',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Reschedule Meeting
          </DialogTitle>
          <DialogDescription>
            {meetingTitle && `Change the date and time for "${meetingTitle}"`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Rescheduling...' : 'Reschedule Meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};