import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle2, XCircle, Loader2, Users, Send, Clock, History, Shield, Settings, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScheduledDistributionDialog } from './ScheduledDistributionDialog';
import { DistributionHistoryViewer } from './DistributionHistoryViewer';
import { DistributionApprovalDialog } from './DistributionApprovalDialog';
import { ManageApproversDialog } from './ManageApproversDialog';
import { ApprovalRulesManager } from './ApprovalRulesManager';

interface EmailDistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  signatureRequestId: string;
}

interface DistributionResult {
  email: string;
  status: 'sent' | 'failed';
  error?: string;
}

export function EmailDistributionDialog({
  open,
  onOpenChange,
  meetingId,
  signatureRequestId,
}: EmailDistributionDialogProps) {
  const { toast } = useToast();
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionResults, setDistributionResults] = useState<DistributionResult[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showManageApproversDialog, setShowManageApproversDialog] = useState(false);
  const [showApprovalRules, setShowApprovalRules] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);

  useEffect(() => {
    if (open) {
      fetchRecipients();
      checkApprovalStatus();
    }
  }, [open, meetingId]);

  const checkApprovalStatus = async () => {
    setIsCheckingApproval(true);
    try {
      const { data, error } = await supabase.rpc('is_distribution_approved', {
        _meeting_id: meetingId,
      });

      if (error) throw error;
      setIsApproved(data || false);
    } catch (error: any) {
      console.error('Error checking approval:', error);
      // Default to approved if check fails
      setIsApproved(true);
    } finally {
      setIsCheckingApproval(false);
    }
  };

  const autoAssignApprovers = async () => {
    try {
      const { data: matchedRules, error } = await supabase.rpc('match_approval_rules', {
        p_meeting_id: meetingId,
      });

      if (error) throw error;

      if (matchedRules && matchedRules.length > 0) {
        const topRule = matchedRules[0];
        
        // Clear existing approvers
        await supabase
          .from('distribution_approvers')
          .delete()
          .eq('meeting_id', meetingId);

        // Insert new approvers based on rule
        const approvers = topRule.approver_ids.map((userId: string, index: number) => ({
          meeting_id: meetingId,
          user_id: userId,
          is_required: topRule.require_all,
          approval_order: index + 1,
        }));

        await supabase
          .from('distribution_approvers')
          .insert(approvers);

        toast({
          title: 'Approvers Assigned',
          description: `Applied rule: ${topRule.rule_name}`,
        });

        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error auto-assigning approvers:', error);
      return false;
    }
  };

  const fetchRecipients = async () => {
    setIsLoadingRecipients(true);
    try {
      // Fetch meeting attendees
      const { data: attendees, error } = await supabase
        .from('meeting_attendees')
        .select('user:profiles!meeting_attendees_user_id_fkey(email)')
        .eq('meeting_id', meetingId);

      if (error) throw error;

      const emails = attendees
        ?.map((a: any) => a.user?.email)
        .filter((email): email is string => !!email) || [];

      setRecipients(emails);
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meeting attendees',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  const handleDistribute = async () => {
    if (!isApproved) {
      toast({
        title: 'Approval Required',
        description: 'Distribution requires approval before sending',
        variant: 'destructive',
      });
      setShowApprovalDialog(true);
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: 'No Recipients',
        description: 'No meeting attendees found to send to',
        variant: 'destructive',
      });
      return;
    }

    setIsDistributing(true);
    setDistributionResults([]);

    try {
      // First, generate the PDF
      const { data: minutesData } = await supabase
        .from('minutes_versions')
        .select('id')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!minutesData) {
        throw new Error('No minutes found for this meeting');
      }

      const { data: brandKit } = await supabase
        .from('brand_kits')
        .select('id')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();

      // Generate PDF
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-branded-pdf', {
        body: {
          meeting_id: meetingId,
          minutes_version_id: minutesData.id,
          brand_kit_id: brandKit?.id,
          signature_request_id: signatureRequestId,
          include_watermark: false,
        },
      });

      if (pdfError) throw pdfError;

      // Now distribute to attendees
      const { data: distributionData, error: distError } = await supabase.functions.invoke('distribute-pdf', {
        body: {
          pdf_generation_id: pdfData.pdf_generation_id,
          custom_recipients: recipients,
        },
      });

      if (distError) throw distError;

      setDistributionResults(distributionData.results || []);

      const sentCount = distributionData.results?.filter((r: DistributionResult) => r.status === 'sent').length || 0;
      const failedCount = distributionData.results?.filter((r: DistributionResult) => r.status === 'failed').length || 0;

      // Log distribution to history
      const { data: historyRecord } = await supabase.from('distribution_history').insert({
        meeting_id: meetingId,
        pdf_generation_id: pdfData.pdf_generation_id,
        status: failedCount === 0 ? 'success' : sentCount > 0 ? 'partial' : 'failed',
        total_recipients: recipients.length,
        successful_count: sentCount,
        failed_count: failedCount,
        recipient_details: distributionData.results,
        distribution_type: 'manual',
      }).select().single();

      // If there are failures, add to retry queue
      if (failedCount > 0 && historyRecord) {
        const failedRecipients = distributionData.results?.filter((r: DistributionResult) => r.status === 'failed') || [];
        const nextRetry = new Date();
        nextRetry.setMinutes(nextRetry.getMinutes() + 2); // First retry in 2 minutes

        await supabase.from('distribution_retry_queue').insert({
          distribution_history_id: historyRecord.id,
          meeting_id: meetingId,
          failed_recipients: failedRecipients,
          next_retry_at: nextRetry.toISOString(),
        });
      }

      if (failedCount === 0) {
        toast({
          title: '✓ Distribution Complete',
          description: `Successfully sent to ${sentCount} recipient${sentCount !== 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: `Sent to ${sentCount}, failed ${failedCount}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Distribution error:', error);
      toast({
        title: 'Distribution Failed',
        description: error.message || 'Failed to distribute minutes',
        variant: 'destructive',
      });
    } finally {
      setIsDistributing(false);
    }
  };

  const sentCount = distributionResults.filter(r => r.status === 'sent').length;
  const failedCount = distributionResults.filter(r => r.status === 'failed').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Email Distribution</DialogTitle>
              <DialogDescription>
                Send approved minutes to meeting attendees
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recipients</span>
              </div>
              <Badge variant="secondary">
                {recipients.length} attendee{recipients.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {isLoadingRecipients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading recipients...</span>
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No meeting attendees found
              </div>
            ) : (
              <ScrollArea className="h-32 rounded-lg border p-3">
                <div className="space-y-1">
                  {recipients.map((email, index) => (
                    <div key={index} className="text-sm flex items-center gap-2">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      {email}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Distribution Results */}
          {distributionResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Distribution Results</span>
                <div className="flex gap-2">
                  {sentCount > 0 && (
                    <Badge variant="default" className="bg-green-500">
                      {sentCount} sent
                    </Badge>
                  )}
                  {failedCount > 0 && (
                    <Badge variant="destructive">
                      {failedCount} failed
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-48 rounded-lg border p-3">
                <div className="space-y-2">
                  {distributionResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        {result.status === 'sent' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className="text-sm">{result.email}</span>
                      </div>
                      {result.error && (
                        <span className="text-xs text-muted-foreground">{result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowHistoryDialog(true)}
                disabled={isDistributing}
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowApprovalRules(true)}
                disabled={isDistributing}
              >
                <Settings className="w-4 h-4 mr-2" />
                Rules
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  const assigned = await autoAssignApprovers();
                  if (assigned) {
                    setShowManageApproversDialog(true);
                  } else {
                    toast({
                      title: 'No Rules Matched',
                      description: 'Configure approvers manually',
                    });
                    setShowManageApproversDialog(true);
                  }
                }}
                disabled={isDistributing}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Approvers
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDistributing}
              >
                {distributionResults.length > 0 ? 'Close' : 'Cancel'}
              </Button>
              {distributionResults.length === 0 ? (
              <>
                {!isApproved && !isCheckingApproval && (
                  <Button
                    variant="outline"
                    onClick={() => setShowApprovalDialog(true)}
                    disabled={isDistributing}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Request Approval
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDialog(true)}
                  disabled={isDistributing || recipients.length === 0 || isLoadingRecipients}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
                <Button
                  onClick={handleDistribute}
                  disabled={isDistributing || recipients.length === 0 || isLoadingRecipients || !isApproved}
                  className="bg-gradient-to-r from-[#FF6B00] to-[#00A651] hover:from-[#FF8C00] hover:to-[#00A651]"
                >
                  {isDistributing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {isApproved ? 'Send Now' : 'Approval Required'}
                    </>
                  )}
                </Button>
              </>
            ) : failedCount > 0 ? (
              <Button
                onClick={handleDistribute}
                disabled={isDistributing}
                variant="outline"
              >
                <Send className="w-4 h-4 mr-2" />
                Retry Failed
              </Button>
            ) : null}
            </div>
          </div>
        </div>
      </DialogContent>

      <ScheduledDistributionDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        meetingId={meetingId}
      />

      <DistributionHistoryViewer
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        meetingId={meetingId}
      />

      <DistributionApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        meetingId={meetingId}
        onApprovalComplete={() => {
          checkApprovalStatus();
          setShowApprovalDialog(false);
        }}
      />

      <ApprovalRulesManager
        open={showApprovalRules}
        onOpenChange={setShowApprovalRules}
      />

      <ManageApproversDialog
        open={showManageApproversDialog}
        onOpenChange={setShowManageApproversDialog}
        meetingId={meetingId}
      />
    </Dialog>
  );
}
