import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { History, CheckCircle2, XCircle, Clock, Mail, Calendar, Users, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface DistributionHistoryViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
}

interface DistributionRecord {
  id: string;
  sent_at: string;
  status: string;
  total_recipients: number;
  successful_count: number;
  failed_count: number;
  recipient_details: Array<{ email: string; status: 'sent' | 'failed'; error?: string }>;
  distribution_type: string;
  error_message?: string;
}

export function DistributionHistoryViewer({
  open,
  onOpenChange,
  meetingId,
}: DistributionHistoryViewerProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<DistributionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<DistributionRecord | null>(null);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, meetingId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('distribution_history')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setHistory((data || []).map(record => ({
        ...record,
        recipient_details: Array.isArray(record.recipient_details) 
          ? record.recipient_details as Array<{ email: string; status: 'sent' | 'failed'; error?: string }>
          : []
      })));
    } catch (error: any) {
      console.error('Error fetching distribution history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load distribution history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case 'partial':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDistributionTypeBadge = (type: string) => {
    return type === 'scheduled' ? (
      <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
    ) : (
      <Badge variant="outline"><Mail className="w-3 h-3 mr-1" />Manual</Badge>
    );
  };

  return (
    <>
      <Dialog open={open && !selectedRecord} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <History className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle>Distribution History</DialogTitle>
                <DialogDescription>
                  View all past email distributions for this meeting
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading history...</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No distributions yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div className="text-sm">
                            <div>{format(new Date(record.sent_at), 'MMM dd, yyyy')}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(record.sent_at), 'HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getDistributionTypeBadge(record.distribution_type)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{record.total_recipients}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${(record.successful_count / record.total_recipients) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {record.successful_count}/{record.total_recipients}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecord(record)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Distribution Details</DialogTitle>
              <DialogDescription>
                Sent on {format(new Date(selectedRecord.sent_at), 'MMMM dd, yyyy \'at\' HH:mm:ss')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getStatusBadge(selectedRecord.status)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div>{getDistributionTypeBadge(selectedRecord.distribution_type)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Total Recipients</div>
                  <div className="text-lg font-semibold">{selectedRecord.total_recipients}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                  <div className="text-lg font-semibold text-green-500">
                    {Math.round((selectedRecord.successful_count / selectedRecord.total_recipients) * 100)}%
                  </div>
                </div>
              </div>

              {selectedRecord.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-destructive">Error</div>
                      <div className="text-sm text-muted-foreground mt-1">{selectedRecord.error_message}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="text-sm font-medium">Recipient Details</div>
                <ScrollArea className="h-64 rounded-lg border">
                  <div className="p-3 space-y-2">
                    {selectedRecord.recipient_details.map((recipient, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {recipient.status === 'sent' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className="text-sm">{recipient.email}</span>
                        </div>
                        {recipient.error && (
                          <span className="text-xs text-muted-foreground">{recipient.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
