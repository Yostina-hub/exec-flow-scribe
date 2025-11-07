import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Users, Building2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BulkOperationsManagerProps {
  selectedTaskIds: string[];
  operation: "reassign" | "status" | "priority" | "delete" | "due_date" | null;
  onClose: () => void;
  onComplete: () => void;
}

interface User {
  id: string;
  full_name: string;
}

interface Department {
  id: string;
  name: string;
}

export function BulkOperationsManager({ 
  selectedTaskIds, 
  operation, 
  onClose, 
  onComplete 
}: BulkOperationsManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Reassignment states
  const [assignTo, setAssignTo] = useState<string>("");
  const [assignType, setAssignType] = useState<"user" | "department">("user");
  const [notes, setNotes] = useState("");
  
  // Status update state
  const [newStatus, setNewStatus] = useState<string>("");
  
  // Priority update state
  const [newPriority, setNewPriority] = useState<string>("");
  
  // Due date update state
  const [newDueDate, setNewDueDate] = useState<Date>();

  useEffect(() => {
    if (operation === "reassign") {
      fetchUsersAndDepartments();
    }
  }, [operation]);

  const fetchUsersAndDepartments = async () => {
    const [usersResult, deptsResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name").order("full_name"),
      supabase.from("guba_departments" as any).select("id, name").order("name")
    ]);

    if (usersResult.data) setUsers(usersResult.data as User[]);
    if (deptsResult.data) setDepartments(deptsResult.data as any as Department[]);
  };

  const handleBulkReassign = async () => {
    if (!assignTo) {
      toast({ title: "Please select a user or department", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update all selected tasks
      const updates = assignType === "user"
        ? { assigned_to: assignTo, assigned_department_id: null }
        : { assigned_department_id: assignTo, assigned_to: null };

      const { error: updateError } = await supabase
        .from("action_items")
        .update(updates)
        .in("id", selectedTaskIds);

      if (updateError) throw updateError;

      // Create audit logs for each task
      const auditLogs = selectedTaskIds.map(taskId => ({
        task_id: taskId,
        action: "bulk_reassignment",
        performed_by: user.id,
        old_value: null,
        new_value: assignType === "user" ? `user:${assignTo}` : `department:${assignTo}`,
        notes: notes || `Bulk reassigned to ${assignType}`,
        created_at: new Date().toISOString()
      }));

      const { error: auditError } = await supabase
        .from("guba_audit_log" as any)
        .insert(auditLogs);

      if (auditError) console.error("Audit log error:", auditError);

      toast({
        title: "✅ Tasks Reassigned",
        description: `Successfully reassigned ${selectedTaskIds.length} tasks`
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error("Bulk reassignment error:", error);
      toast({
        title: "Reassignment Failed",
        description: "Failed to reassign tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!newStatus) {
      toast({ title: "Please select a status", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("action_items")
        .update({ status: newStatus as any })
        .in("id", selectedTaskIds);

      if (error) throw error;

      // Create audit logs
      const auditLogs = selectedTaskIds.map(taskId => ({
        task_id: taskId,
        action: "bulk_status_update",
        performed_by: user.id,
        new_value: newStatus,
        created_at: new Date().toISOString()
      }));

      await supabase.from("guba_audit_log" as any).insert(auditLogs);

      toast({
        title: "✅ Status Updated",
        description: `Updated ${selectedTaskIds.length} tasks to ${newStatus.replace('_', ' ')}`
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error("Bulk status update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update task status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPriorityUpdate = async () => {
    if (!newPriority) {
      toast({ title: "Please select a priority", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("action_items")
        .update({ priority: newPriority as any })
        .in("id", selectedTaskIds);

      if (error) throw error;

      // Create audit logs
      const auditLogs = selectedTaskIds.map(taskId => ({
        task_id: taskId,
        action: "bulk_priority_update",
        performed_by: user.id,
        new_value: newPriority,
        created_at: new Date().toISOString()
      }));

      await supabase.from("guba_audit_log" as any).insert(auditLogs);

      toast({
        title: "✅ Priority Updated",
        description: `Updated ${selectedTaskIds.length} tasks to ${newPriority} priority`
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error("Bulk priority update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update task priority. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDueDateUpdate = async () => {
    if (!newDueDate) {
      toast({ title: "Please select a due date", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("action_items")
        .update({ due_date: newDueDate.toISOString() })
        .in("id", selectedTaskIds);

      if (error) throw error;

      // Create audit logs
      const auditLogs = selectedTaskIds.map(taskId => ({
        task_id: taskId,
        action: "bulk_due_date_update",
        performed_by: user.id,
        new_value: newDueDate.toISOString(),
        created_at: new Date().toISOString()
      }));

      await supabase.from("guba_audit_log" as any).insert(auditLogs);

      toast({
        title: "✅ Due Date Updated",
        description: `Updated ${selectedTaskIds.length} tasks with new due date`
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error("Bulk due date update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update due dates. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("action_items")
        .delete()
        .in("id", selectedTaskIds);

      if (error) throw error;

      toast({
        title: "✅ Tasks Deleted",
        description: `Successfully deleted ${selectedTaskIds.length} tasks`
      });

      onComplete();
      onClose();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reassignment Dialog
  if (operation === "reassign") {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Bulk Reassign Tasks
            </DialogTitle>
            <DialogDescription>
              Reassign {selectedTaskIds.length} selected task{selectedTaskIds.length !== 1 ? 's' : ''} to a user or department
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assignType} onValueChange={(val: "user" | "department") => {
                setAssignType(val);
                setAssignTo("");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Specific User</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignType === "user" ? (
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Department</Label>
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {dept.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add reassignment notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleBulkReassign} disabled={loading || !assignTo}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reassign {selectedTaskIds.length} Task{selectedTaskIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Status Update Dialog
  if (operation === "status") {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Task Status</DialogTitle>
            <DialogDescription>
              Change status for {selectedTaskIds.length} selected task{selectedTaskIds.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatusUpdate} disabled={loading || !newStatus}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Priority Update Dialog
  if (operation === "priority") {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Task Priority</DialogTitle>
            <DialogDescription>
              Change priority for {selectedTaskIds.length} selected task{selectedTaskIds.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Priority</Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleBulkPriorityUpdate} disabled={loading || !newPriority}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Due Date Update Dialog
  if (operation === "due_date") {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Due Date</DialogTitle>
            <DialogDescription>
              Change due date for {selectedTaskIds.length} selected task{selectedTaskIds.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDueDate ? format(newDueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDueDate}
                    onSelect={setNewDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleBulkDueDateUpdate} disabled={loading || !newDueDate}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Due Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Delete Confirmation Dialog
  if (operation === "delete") {
    return (
      <AlertDialog open={true} onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {selectedTaskIds.length} Task{selectedTaskIds.length !== 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected tasks and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete {selectedTaskIds.length} Task{selectedTaskIds.length !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}
