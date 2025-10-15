import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, UserPlus } from 'lucide-react';

interface SignOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signatureRequestId: string;
  onSuccess: () => void;
}

export function SignOffDialog({ open, onOpenChange, signatureRequestId, onSuccess }: SignOffDialogProps) {
  const { toast } = useToast();
  const [action, setAction] = useState<'approve' | 'reject' | 'delegate'>('approve');
  const [reason, setReason] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [delegateTo, setDelegateTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name');
    if (data) setUsers(data);
  };

  const generateCryptographicHash = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (action === 'approve') {
        const { error } = await supabase
          .from('signature_requests')
          .update({ status: 'approved', signed_at: new Date().toISOString() })
          .eq('id', signatureRequestId);

        if (error) throw error;

        toast({ title: 'Success', description: 'Minutes approved and signed' });
      } else if (action === 'reject') {
        const { error } = await supabase
          .from('signature_requests')
          .update({ status: 'rejected', rejection_reason: reason })
          .eq('id', signatureRequestId);

        if (error) throw error;

        toast({ title: 'Rejected', description: 'Signature request rejected' });
      } else if (action === 'delegate') {
        if (!delegateTo || !reasonCode) {
          toast({ title: 'Error', description: 'Please select a delegate and reason', variant: 'destructive' });
          return;
        }

        // Create cryptographic hash
        const hashData = `${user.id}-${delegateTo}-${reasonCode}-${Date.now()}`;
        const hash = await generateCryptographicHash(hashData);

        // Update signature request
        const { error: updateError } = await supabase
          .from('signature_requests')
          .update({ status: 'delegated', assigned_to: delegateTo })
          .eq('id', signatureRequestId);

        if (updateError) throw updateError;

        // Create delegation record
        const { error: delegationError } = await supabase
          .from('delegation_records')
          .insert({
            signature_request_id: signatureRequestId,
            delegated_from: user.id,
            delegated_to: delegateTo,
            reason_code: reasonCode,
            reason_details: reason,
            cryptographic_hash: hash,
          });

        if (delegationError) throw delegationError;

        toast({ title: 'Delegated', description: 'Signature request delegated successfully' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error processing sign-off:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sign-Off Decision</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={action === 'approve' ? 'default' : 'outline'}
                onClick={() => setAction('approve')}
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant={action === 'reject' ? 'default' : 'outline'}
                onClick={() => setAction('reject')}
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                variant={action === 'delegate' ? 'default' : 'outline'}
                onClick={() => {
                  setAction('delegate');
                  loadUsers();
                }}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Delegate
              </Button>
            </div>
          </div>

          {action === 'delegate' && (
            <>
              <div className="space-y-2">
                <Label>Delegate To</Label>
                <Select value={delegateTo} onValueChange={setDelegateTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || 'Unknown User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason Code</Label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="out_of_office">Out of Office</SelectItem>
                    <SelectItem value="conflict_of_interest">Conflict of Interest</SelectItem>
                    <SelectItem value="specialized_expertise">Specialized Expertise Required</SelectItem>
                    <SelectItem value="workload">Workload Management</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(action === 'reject' || action === 'delegate') && (
            <div className="space-y-2">
              <Label>{action === 'reject' ? 'Rejection Reason' : 'Additional Details'}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={action === 'reject' ? 'Explain why you are rejecting...' : 'Optional details...'}
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
