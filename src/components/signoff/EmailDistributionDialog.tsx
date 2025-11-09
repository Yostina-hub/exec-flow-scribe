import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle2, XCircle, Loader2, Users, Send, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScheduledDistributionDialog } from './ScheduledDistributionDialog';

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

  useEffect(() => {
    if (open) {
      fetchRecipients();
    }
  }, [open, meetingId]);

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
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDistributing}
            >
              {distributionResults.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {distributionResults.length === 0 ? (
              <>
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
                  disabled={isDistributing || recipients.length === 0 || isLoadingRecipients}
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
                      Send Now
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
      </DialogContent>

      <ScheduledDistributionDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        meetingId={meetingId}
      />
    </Dialog>
  );
}
