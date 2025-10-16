import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Meeting {
  id: string;
  title: string;
}

export const CreateActionDialog = () => {
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchMeetings();
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    
    if (!error && data) {
      setUsers(data);
    }
  };

  const fetchMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title')
      .order('start_time', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setMeetings(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const title = formData.get('task') as string;
      const description = formData.get('details') as string;
      const assignedTo = formData.get('assignee') as string;
      const priority = formData.get('priority') as string;
      const meetingId = formData.get('meeting') as string || null;

      if (!deadline) {
        toast({
          title: "Error",
          description: "Please select a deadline",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('action_items')
        .insert([{
          title,
          description,
          assigned_to: assignedTo,
          created_by: user.id,
          due_date: deadline.toISOString().split('T')[0],
          priority: priority as 'low' | 'medium' | 'high',
          meeting_id: meetingId,
          status: 'pending' as const,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Action item created successfully",
      });
      
      setOpen(false);
      setDeadline(undefined);
    } catch (error: any) {
      console.error('Error creating action:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create action item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Action
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Action Item</DialogTitle>
          <DialogDescription>
            Add a new task or follow-up action with assignment details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task">Task Description</Label>
              <Input
                id="task"
                placeholder="e.g., Review Q4 financial projections"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Additional Details</Label>
              <Textarea
                id="details"
                placeholder="Add more context about this action..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To</Label>
              <Select name="assignee" required>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select defaultValue="medium" required>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting">Related Meeting</Label>
              <Select name="meeting">
                <SelectTrigger id="meeting">
                  <SelectValue placeholder="Select meeting (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.map(meeting => (
                    <SelectItem key={meeting.id} value={meeting.id}>
                      {meeting.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Action"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
