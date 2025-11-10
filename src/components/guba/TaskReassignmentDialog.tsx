import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck, Building2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";

interface TaskReassignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onReassigned?: () => void;
}

export const TaskReassignmentDialog = ({ open, onOpenChange, task, onReassigned }: TaskReassignmentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [reassignmentNotes, setReassignmentNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchDepartments();
      fetchUsers();
      setSelectedDepartment(task?.department_id || "");
      setSelectedUser(task?.assigned_to || "");
      setNewDueDate(task?.due_date || format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    }
  }, [open, task]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleReassign = async () => {
    if (!selectedUser) {
      toast({
        title: "User Required",
        description: "Please select a user to assign the task to",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update the task
      const { error: updateError } = await supabase
        .from('action_items')
        .update({
          assigned_to: selectedUser,
          department_id: (selectedDepartment && selectedDepartment !== 'no-department') ? selectedDepartment : null,
          due_date: newDueDate,
          status_detail: reassignmentNotes || null
        })
        .eq('id', task.id);

      if (updateError) throw updateError;

      // Log the reassignment in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action_type: 'task_reassigned',
          meeting_id: task.meeting_id,
          action_details: {
            task_id: task.id,
            from_user: task.assigned_to,
            to_user: selectedUser,
            from_department: task.department_id,
            to_department: selectedDepartment,
            notes: reassignmentNotes
          }
        });

      toast({
        title: "Task Reassigned",
        description: "Task has been successfully reassigned",
      });

      onReassigned?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error reassigning task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reassign task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Reassign Task
          </DialogTitle>
          <DialogDescription>
            Assign this task to a different team member or department
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Task Info */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <h4 className="font-semibold mb-2">{task.title}</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{task.priority} priority</Badge>
              {task.ai_generated && (
                <Badge variant="secondary" className="gap-1">
                  AI Generated {task.confidence_score && `(${Math.round(task.confidence_score * 100)}%)`}
                </Badge>
              )}
            </div>
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label htmlFor="department" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Department
            </Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-department">No specific department</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} {dept.name_am && `(${dept.name_am})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Assign To
            </Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </Label>
            <input
              id="due-date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Reassignment Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Reassignment Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={reassignmentNotes}
              onChange={(e) => setReassignmentNotes(e.target.value)}
              placeholder="Add context or instructions for the new assignee..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleReassign} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reassign Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
