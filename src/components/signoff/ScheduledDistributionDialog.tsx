import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar as CalendarIcon, Repeat, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface ScheduledDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
}

export function ScheduledDistributionDialog({
  open,
  onOpenChange,
  meetingId,
}: ScheduledDistributionDialogProps) {
  const { toast } = useToast();
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'recurring'>('scheduled');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(1);
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (scheduleType === 'scheduled' && !scheduledDate) {
      toast({
        title: 'Date Required',
        description: 'Please select a date for scheduled distribution',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const scheduledDateTime = scheduledDate 
        ? new Date(`${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}`)
        : null;

      const nextSendAt = scheduleType === 'immediate' 
        ? new Date() 
        : scheduledDateTime;

      const { error } = await supabase
        .from('distribution_schedules')
        .insert({
          meeting_id: meetingId,
          schedule_type: scheduleType,
          scheduled_time: scheduledDateTime?.toISOString(),
          recurrence_pattern: scheduleType === 'recurring' ? recurrencePattern : null,
          recurrence_day: scheduleType === 'recurring' ? recurrenceDay : null,
          enabled,
          next_send_at: nextSendAt?.toISOString(),
        });

      if (error) throw error;

      toast({
        title: '✓ Schedule Created',
        description: scheduleType === 'immediate' 
          ? 'Distribution will be sent immediately'
          : `Distribution scheduled for ${format(scheduledDateTime!, 'PPP')} at ${scheduledTime}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Schedule creation error:', error);
      toast({
        title: 'Schedule Failed',
        description: error.message || 'Failed to create distribution schedule',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Schedule Distribution</DialogTitle>
              <DialogDescription>
                Configure automatic email distribution
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>Distribution Type</Label>
            <Select value={scheduleType} onValueChange={(value: any) => setScheduleType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Send Immediately</SelectItem>
                <SelectItem value="scheduled">Send at Specific Time</SelectItem>
                <SelectItem value="recurring">Recurring Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection for Scheduled */}
          {(scheduleType === 'scheduled' || scheduleType === 'recurring') && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Time Selection */}
          {(scheduleType === 'scheduled' || scheduleType === 'recurring') && (
            <div className="space-y-2">
              <Label>Time</Label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Recurrence Pattern */}
          {scheduleType === 'recurring' && (
            <>
              <div className="space-y-2">
                <Label>Repeat Pattern</Label>
                <Select value={recurrencePattern} onValueChange={(value: any) => setRecurrencePattern(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrencePattern === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={recurrenceDay.toString()} onValueChange={(value) => setRecurrenceDay(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Schedule</Label>
              <p className="text-sm text-muted-foreground">
                Schedule will be active immediately
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-gradient-to-r from-[#FF6B00] to-[#00A651] hover:from-[#FF8C00] hover:to-[#00A651]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Schedule
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}