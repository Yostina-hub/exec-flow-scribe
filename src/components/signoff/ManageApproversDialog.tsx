import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ManageApproversDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Approver {
  id: string;
  user_id: string;
  is_required: boolean;
  profiles: {
    full_name: string;
    email: string;
  };
}

export function ManageApproversDialog({
  open,
  onOpenChange,
  meetingId,
}: ManageApproversDialogProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isRequired, setIsRequired] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      loadApprovers();
    }
  }, [open, meetingId]);

  const loadUsers = async () => {
    try {
      // Get meeting attendees
      const { data: attendees, error } = await supabase
        .from('meeting_attendees')
        .select('user:profiles(id, full_name, email)')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      const usersList = attendees
        ?.map((a: any) => a.user)
        .filter(Boolean) || [];

      setUsers(usersList);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const loadApprovers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('distribution_approvers')
        .select(`
          id,
          user_id,
          is_required,
          profiles(full_name, email)
        `)
        .eq('meeting_id', meetingId)
        .order('approval_order', { ascending: true });

      if (error) throw error;
      setApprovers((data as any) || []);
    } catch (error: any) {
      console.error('Error loading approvers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approvers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddApprover = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('distribution_approvers')
        .insert({
          meeting_id: meetingId,
          user_id: selectedUserId,
          is_required: isRequired,
          approval_order: approvers.length + 1,
          created_by: user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This user is already an approver');
        }
        throw error;
      }

      toast({
        title: 'Approver Added',
        description: 'Successfully added approver',
      });

      setSelectedUserId('');
      loadApprovers();
    } catch (error: any) {
      console.error('Error adding approver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add approver',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveApprover = async (approverId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('distribution_approvers')
        .delete()
        .eq('id', approverId);

      if (error) throw error;

      toast({
        title: 'Approver Removed',
        description: 'Successfully removed approver',
      });

      loadApprovers();
    } catch (error: any) {
      console.error('Error removing approver:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove approver',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const availableUsers = users.filter(
    u => !approvers.some(a => a.user_id === u.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Manage Approvers</DialogTitle>
              <DialogDescription>
                Configure who can approve distribution requests
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Approver Section */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium">Add New Approver</div>
            <div className="space-y-3">
              <div>
                <Label>Select User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
                <Label htmlFor="required">Required Approver</Label>
              </div>
              <Button
                onClick={handleAddApprover}
                disabled={isLoading || !selectedUserId}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Approver
              </Button>
            </div>
          </div>

          {/* Current Approvers */}
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Current Approvers ({approvers.length})
            </div>
            {approvers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No approvers added yet
              </div>
            ) : (
              <div className="space-y-2">
                {approvers.map((approver) => (
                  <div
                    key={approver.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {approver.profiles.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {approver.profiles.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {approver.is_required && (
                        <span className="text-xs text-muted-foreground">Required</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveApprover(approver.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
