import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CreateSignatureRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  onSuccess: () => void;
}

export function CreateSignatureRequestDialog({
  open,
  onOpenChange,
  meetingId,
  onSuccess,
}: CreateSignatureRequestDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignTo, setAssignTo] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [countersignRoles, setCountersignRoles] = useState<string[]>([]);
  const [autoAssign, setAutoAssign] = useState(true);

  useEffect(() => {
    if (open) {
      fetchUsersAndRoles();
    }
  }, [open]);

  const fetchUsersAndRoles = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      
      setUsers(usersData || []);

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name, description');
      
      setRoles(rolesData || []);

      // Auto-assign to CEO by default if available
      if (autoAssign && rolesData) {
        const ceoRole = rolesData.find(r => r.name.toLowerCase().includes('ceo'));
        if (ceoRole) {
          // Get users with CEO role
          const { data: ceoUsers } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role_id', ceoRole.id)
            .limit(1);
          
          if (ceoUsers && ceoUsers.length > 0) {
            setAssignTo(ceoUsers[0].user_id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching users/roles:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!assignTo) {
        toast({
          title: 'Error',
          description: 'Please select a user to assign',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch meeting data
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('title, description')
        .eq('id', meetingId)
        .single();

      // Fetch decisions
      const { data: decisionsData } = await supabase
        .from('decisions')
        .select('*')
        .eq('meeting_id', meetingId);

      // Fetch action items
      const { data: actionsData } = await supabase
        .from('action_items')
        .select('*')
        .eq('meeting_id', meetingId);

      // Fetch transcriptions for minutes content
      const { data: transcriptData } = await supabase
        .from('transcriptions')
        .select('content, speaker_name, timestamp')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      // Build minutes content from transcripts
      const minutesContent = transcriptData
        ?.map(t => `[${t.speaker_name}]: ${t.content}`)
        .join('\n\n') || 'No transcription available';

      // Create package data
      const packageData = {
        minutes: minutesContent,
        decisions: decisionsData || [],
        actions: actionsData || [],
        sensitiveSections: [],
      };

      // Create signature request with both meeting_id and minutes_version_id
      const { data: sigRequest, error: sigError } = await supabase
        .from('signature_requests')
        .insert({
          meeting_id: meetingId,
          minutes_version_id: crypto.randomUUID(), // Generate temp ID for version tracking
          requested_by: user.id,
          assigned_to: assignTo,
          package_data: packageData as any,
          status: 'pending',
        })
        .select()
        .single();

      if (sigError) throw sigError;

      // Note: Countersignature feature requires section_sensitivity_id
      // For now, we'll skip this or need to create sensitive sections first
      // This can be enhanced later with proper sensitive section management

      // Send notification
      await supabase.functions.invoke('send-notification-email', {
        body: {
          signatureRequestId: sigRequest.id,
          type: 'new_request',
        },
      });

      toast({
        title: 'Success',
        description: 'Signature request created and assigned',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating signature request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create signature request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCountersignRole = (roleId: string) => {
    setCountersignRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Signature Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Auto-assign toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-assign"
              checked={autoAssign}
              onCheckedChange={(checked) => setAutoAssign(checked as boolean)}
            />
            <Label htmlFor="auto-assign" className="text-sm">
              Auto-assign to CEO (if available)
            </Label>
          </div>

          {/* Primary signer */}
          <div className="space-y-2">
            <Label>Assign To (Primary Signer)</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Countersignature roles */}
          <div className="space-y-3">
            <Label>Required Countersignatures (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Select roles that must also approve this document
            </p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={countersignRoles.includes(role.id)}
                    onCheckedChange={() => toggleCountersignRole(role.id)}
                  />
                  <Label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span>{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
            {countersignRoles.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {countersignRoles.map(roleId => {
                  const role = roles.find(r => r.id === roleId);
                  return (
                    <Badge key={roleId} variant="secondary">
                      {role?.name}
                      <button
                        onClick={() => toggleCountersignRole(roleId)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
