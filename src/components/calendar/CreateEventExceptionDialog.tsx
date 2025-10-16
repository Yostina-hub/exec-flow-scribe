import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CreateEventExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  exceptionDate: Date;
  originalStartTime: string;
  originalEndTime: string;
  originalLocation?: string;
  originalDescription?: string;
  onSuccess?: () => void;
}

export function CreateEventExceptionDialog({
  open,
  onOpenChange,
  meetingId,
  exceptionDate,
  originalStartTime,
  originalEndTime,
  originalLocation,
  originalDescription,
  onSuccess
}: CreateEventExceptionDialogProps) {
  const [isCancelled, setIsCancelled] = useState(false);
  const [overrideStartTime, setOverrideStartTime] = useState(format(new Date(originalStartTime), "HH:mm"));
  const [overrideEndTime, setOverrideEndTime] = useState(format(new Date(originalEndTime), "HH:mm"));
  const [overrideLocation, setOverrideLocation] = useState(originalLocation || "");
  const [overrideDescription, setOverrideDescription] = useState(originalDescription || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const exceptionDateStr = format(exceptionDate, "yyyy-MM-dd");

      const { error } = await supabase
        .from('event_exceptions')
        .insert({
          meeting_id: meetingId,
          exception_date: exceptionDateStr,
          is_cancelled: isCancelled,
          override_start_time: isCancelled ? null : `${exceptionDateStr}T${overrideStartTime}:00`,
          override_end_time: isCancelled ? null : `${exceptionDateStr}T${overrideEndTime}:00`,
          override_location: isCancelled ? null : overrideLocation,
          override_description: isCancelled ? null : overrideDescription,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Exception Created",
        description: isCancelled 
          ? "This occurrence has been cancelled."
          : "This occurrence has been modified.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating exception:', error);
      toast({
        title: "Error",
        description: "Failed to create exception. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modify Occurrence</DialogTitle>
          <DialogDescription>
            Make changes to this specific occurrence on {format(exceptionDate, "PPP")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="cancelled">Cancel this occurrence</Label>
              <Switch
                id="cancelled"
                checked={isCancelled}
                onCheckedChange={setIsCancelled}
              />
            </div>

            {!isCancelled && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={overrideStartTime}
                    onChange={(e) => setOverrideStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={overrideEndTime}
                    onChange={(e) => setOverrideEndTime(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={overrideLocation}
                    onChange={(e) => setOverrideLocation(e.target.value)}
                    placeholder="Meeting location"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={overrideDescription}
                    onChange={(e) => setOverrideDescription(e.target.value)}
                    placeholder="Additional notes"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
