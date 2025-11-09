import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, UserCheck, AlertCircle, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface DistributionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  onApprovalComplete?: () => void;
}

interface Approver {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
  is_required: boolean;
  response?: {
    response: string;
    comments: string;
    responded_at: string;
  };
}

interface ApprovalRequest {
  id: string;
  status: string;
  required_approvals: number;
  current_approvals: number;
  approval_threshold: string;
  requested_at: string;
}

export function DistributionApprovalDialog({
  open,
  onOpenChange,
  meetingId,
  onApprovalComplete,
}: DistributionApprovalDialogProps) {
  const { toast } = useToast();
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCurrentUser();
      loadApprovers();
      loadApprovalRequest();
    }
  }, [open, meetingId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
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

  const loadApprovalRequest = async () => {
    try {
      // Get the latest approval request
      const { data: request, error: requestError } = await supabase
        .from('distribution_approval_requests')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError) throw requestError;
      
      if (request) {
        setApprovalRequest(request);

        // Load responses for this request
        const { data: responses, error: responsesError } = await supabase
          .from('distribution_approval_responses')
          .select('approver_id, response, comments, responded_at')
          .eq('approval_request_id', request.id);

        if (responsesError) throw responsesError;

        // Merge responses with approvers
        setApprovers(prev => prev.map(approver => ({
          ...approver,
          response: responses?.find(r => r.approver_id === approver.user_id),
        })));
      }
    } catch (error: any) {
      console.error('Error loading approval request:', error);
    }
  };

  const handleCreateApprovalRequest = async () => {
    if (approvers.length === 0) {
      toast({
        title: 'No Approvers',
        description: 'Please add approvers before requesting approval',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('distribution_approval_requests')
        .insert({
          meeting_id: meetingId,
          requested_by: currentUserId,
          required_approvals: approvers.filter(a => a.is_required).length,
          approval_threshold: 'all',
        })
        .select()
        .single();

      if (error) throw error;

      setApprovalRequest(data);

      // Send notifications to approvers (store in metadata for now)
      console.log(`Approval request sent to ${approvers.length} approvers`);

      toast({
        title: 'Approval Requested',
        description: `Sent approval request to ${approvers.length} approver(s)`,
      });

      loadApprovalRequest();
    } catch (error: any) {
      console.error('Error creating approval request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create approval request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (response: 'approved' | 'rejected') => {
    if (!approvalRequest) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('distribution_approval_responses')
        .insert({
          approval_request_id: approvalRequest.id,
          approver_id: currentUserId,
          response,
          comments: comments || null,
        });

      if (error) throw error;

      toast({
        title: response === 'approved' ? 'Approved' : 'Rejected',
        description: `You have ${response} the distribution request`,
      });

      setComments('');
      loadApprovalRequest();

      if (response === 'approved' && onApprovalComplete) {
        onApprovalComplete();
      }
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit response',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (!approvalRequest) return null;

    switch (approvalRequest.status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const isCurrentUserApprover = approvers.some(a => a.user_id === currentUserId);
  const hasCurrentUserResponded = approvers.find(a => a.user_id === currentUserId)?.response;
  const canRespond = isCurrentUserApprover && !hasCurrentUserResponded && approvalRequest?.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Distribution Approval</DialogTitle>
                <DialogDescription>
                  Manage approval workflow for distribution
                </DialogDescription>
              </div>
            </div>
            {approvalRequest && getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Approval Request Status */}
          {approvalRequest && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Approval Progress</span>
                <span className="text-sm text-muted-foreground">
                  {approvalRequest.current_approvals}/{approvalRequest.required_approvals} approved
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(approvalRequest.current_approvals / approvalRequest.required_approvals) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Approvers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Approvers ({approvers.length})</span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : approvers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No approvers configured</p>
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-lg border">
                <div className="p-3 space-y-2">
                  {approvers.map((approver) => (
                    <div
                      key={approver.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {approver.profiles.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{approver.profiles.full_name}</div>
                          <div className="text-xs text-muted-foreground">{approver.profiles.email}</div>
                          {approver.response?.comments && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              "{approver.response.comments}"
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        {approver.response ? (
                          approver.response.response === 'approved' ? (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Response Section for Approvers */}
          {canRespond && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Your Response</div>
              <Textarea
                placeholder="Add optional comments..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRespond('approved')}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRespond('rejected')}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!approvalRequest && currentUserId && !isCurrentUserApprover && (
              <Button
                onClick={handleCreateApprovalRequest}
                disabled={isSubmitting || approvers.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Request Approval
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
