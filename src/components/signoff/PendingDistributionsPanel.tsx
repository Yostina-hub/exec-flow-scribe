import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Send, Trash2, Loader2, Mail, Calendar, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { EmailDistributionDialog } from './EmailDistributionDialog';
import { Checkbox } from '@/components/ui/checkbox';

interface PendingDistributionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PendingDistribution {
  id: string;
  meeting_id: string;
  signature_request_id: string | null;
  recipient_count: number;
  notes: string | null;
  created_at: string;
  meeting_title?: string;
}

export function PendingDistributionsPanel({
  open,
  onOpenChange,
}: PendingDistributionsPanelProps) {
  const { toast } = useToast();
  const [pendingDistributions, setPendingDistributions] = useState<PendingDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDistribution, setSelectedDistribution] = useState<PendingDistribution | null>(null);
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchSending, setIsBatchSending] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPendingDistributions();
    }
  }, [open]);

  const fetchPendingDistributions = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pending_distributions')
        .select(`
          *,
          meeting:meetings(title)
        `)
        .eq('created_by', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map((d: any) => ({
        ...d,
        meeting_title: d.meeting?.title || 'Untitled Meeting',
      })) || [];

      setPendingDistributions(formatted);
    } catch (error: any) {
      console.error('Error fetching pending distributions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending distributions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistribute = (distribution: PendingDistribution) => {
    setSelectedDistribution(distribution);
    setShowDistributeDialog(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pending_distributions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Pending distribution removed',
      });

      fetchPendingDistributions();
    } catch (error: any) {
      console.error('Error deleting pending distribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete pending distribution',
        variant: 'destructive',
      });
    }
  };

  const handleDistributionComplete = async () => {
    if (!selectedDistribution) return;

    try {
      // Mark as sent
      await supabase
        .from('pending_distributions')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', selectedDistribution.id);

      toast({
        title: 'Distribution Complete',
        description: 'The pending distribution has been sent',
      });

      setShowDistributeDialog(false);
      setSelectedDistribution(null);
      fetchPendingDistributions();
    } catch (error: any) {
      console.error('Error updating distribution:', error);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingDistributions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingDistributions.map(d => d.id)));
    }
  };

  const handleBatchDistribute = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No Selections',
        description: 'Please select distributions to send',
        variant: 'destructive',
      });
      return;
    }

    setIsBatchSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-distribute-pending', {
        body: {
          pending_distribution_ids: Array.from(selectedIds),
        },
      });

      if (error) throw error;

      const { summary } = data;
      
      toast({
        title: 'Batch Distribution Complete',
        description: `${summary.success} successful, ${summary.partial} partial, ${summary.failed} failed`,
      });

      setSelectedIds(new Set());
      fetchPendingDistributions();
    } catch (error: any) {
      console.error('Error in batch distribution:', error);
      toast({
        title: 'Batch Distribution Failed',
        description: error.message || 'Failed to distribute selected items',
        variant: 'destructive',
      });
    } finally {
      setIsBatchSending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Pending Distributions</DialogTitle>
                <DialogDescription>
                  Email distributions saved for later
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {pendingDistributions.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIds.size === pendingDistributions.length && pendingDistributions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                  </span>
                </div>
                {selectedIds.size > 0 && (
                  <Button
                    onClick={handleBatchDistribute}
                    disabled={isBatchSending}
                    className="bg-gradient-to-r from-[#FF6B00] to-[#00A651] hover:from-[#FF8C00] hover:to-[#00A651]"
                  >
                    {isBatchSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending {selectedIds.size}...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Selected ({selectedIds.size})
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading pending distributions...</span>
              </div>
            ) : pendingDistributions.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No pending distributions</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Distributions marked as "Do Later" will appear here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {pendingDistributions.map((distribution) => (
                    <div
                      key={distribution.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedIds.has(distribution.id)}
                            onCheckedChange={() => toggleSelection(distribution.id)}
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{distribution.meeting_title}</h4>
                            <Badge variant="secondary" className="gap-1">
                              <Mail className="w-3 h-3" />
                              {distribution.recipient_count} recipient{distribution.recipient_count !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Saved {format(new Date(distribution.created_at), 'PPp')}
                          </div>
                          {distribution.notes && (
                            <p className="text-sm text-muted-foreground">{distribution.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleDistribute(distribution)}
                            className="bg-gradient-to-r from-[#FF6B00] to-[#00A651] hover:from-[#FF8C00] hover:to-[#00A651]"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(distribution.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedDistribution && showDistributeDialog && (
        <EmailDistributionDialog
          open={showDistributeDialog}
          onOpenChange={(open) => {
            setShowDistributeDialog(open);
            if (!open) {
              handleDistributionComplete();
            }
          }}
          meetingId={selectedDistribution.meeting_id}
          signatureRequestId={selectedDistribution.signature_request_id || ''}
        />
      )}
    </>
  );
}
