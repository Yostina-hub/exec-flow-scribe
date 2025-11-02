import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckSquare, 
  Calendar, 
  FileText, 
  Send, 
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  status: string;
}

interface BatchOperation {
  id: string;
  type: 'export' | 'generate_minutes' | 'send_emails' | 'update_status';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  completed: number;
  failed: number;
}

export const BatchOperationsManager = () => {
  const { toast } = useToast();
  const [selectedMeetings, setSelectedMeetings] = useState<string[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, start_time, status')
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast({
        title: 'Failed to load meetings',
        variant: 'destructive',
      });
    } finally {
      setLoadingMeetings(false);
    }
  };

  const toggleMeeting = (meetingId: string) => {
    setSelectedMeetings(prev =>
      prev.includes(meetingId)
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    );
  };

  const selectAll = () => {
    if (selectedMeetings.length === meetings.length) {
      setSelectedMeetings([]);
    } else {
      setSelectedMeetings(meetings.map(m => m.id));
    }
  };

  const executeBatchOperation = async (type: BatchOperation['type']) => {
    if (selectedMeetings.length === 0) {
      toast({
        title: 'No meetings selected',
        description: 'Please select at least one meeting',
        variant: 'destructive',
      });
      return;
    }

    const operationId = Math.random().toString(36).substring(7);
    const newOperation: BatchOperation = {
      id: operationId,
      type,
      status: 'processing',
      total: selectedMeetings.length,
      completed: 0,
      failed: 0,
    };

    setOperations(prev => [...prev, newOperation]);
    setIsProcessing(true);

    let completed = 0;
    let failed = 0;

    for (const meetingId of selectedMeetings) {
      try {
        switch (type) {
          case 'generate_minutes':
            await supabase.functions.invoke('generate-minutes', {
              body: { meetingId }
            });
            break;
          case 'send_emails':
            await supabase.functions.invoke('auto-distribute-minutes', {
              body: { meetingId }
            });
            break;
          case 'export':
            // Export logic would go here
            break;
          case 'update_status':
            await supabase
              .from('meetings')
              .update({ status: 'completed' })
              .eq('id', meetingId);
            break;
        }
        completed++;
      } catch (error) {
        console.error(`Failed operation for meeting ${meetingId}:`, error);
        failed++;
      }

      // Update operation progress
      setOperations(prev =>
        prev.map(op =>
          op.id === operationId
            ? { ...op, completed, failed }
            : op
        )
      );
    }

    // Mark operation as complete
    setOperations(prev =>
      prev.map(op =>
        op.id === operationId
          ? { ...op, status: 'completed' }
          : op
      )
    );

    setIsProcessing(false);
    setSelectedMeetings([]);

    toast({
      title: 'Batch operation completed',
      description: `Successfully processed ${completed} meetings, ${failed} failed`,
    });
  };

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-background">
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Batch Operations Manager
        </CardTitle>
        <CardDescription>
          Perform bulk actions on multiple meetings at once
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="meetings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meetings">Select Meetings</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="meetings" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button onClick={loadMeetings} disabled={loadingMeetings} variant="outline">
                {loadingMeetings ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load Meetings'
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={selectAll}
                  variant="outline"
                  size="sm"
                  disabled={meetings.length === 0}
                >
                  {selectedMeetings.length === meetings.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Badge variant="secondary">
                  {selectedMeetings.length} selected
                </Badge>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-4 space-y-2">
                {meetings.map(meeting => (
                  <div
                    key={meeting.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedMeetings.includes(meeting.id)}
                      onCheckedChange={() => toggleMeeting(meeting.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(meeting.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{meeting.status}</Badge>
                  </div>
                ))}
                {meetings.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No meetings loaded</p>
                    <p className="text-xs mt-1">Click "Load Meetings" to start</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => executeBatchOperation('generate_minutes')}
                disabled={isProcessing || selectedMeetings.length === 0}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Generate Minutes
              </Button>
              <Button
                onClick={() => executeBatchOperation('send_emails')}
                disabled={isProcessing || selectedMeetings.length === 0}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Send Emails
              </Button>
              <Button
                onClick={() => executeBatchOperation('export')}
                disabled={isProcessing || selectedMeetings.length === 0}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button
                onClick={() => executeBatchOperation('update_status')}
                disabled={isProcessing || selectedMeetings.length === 0}
                variant="outline"
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {operations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No operations yet</p>
                    <p className="text-xs mt-1">Execute batch operations to see them here</p>
                  </div>
                ) : (
                  operations.map(operation => (
                    <div
                      key={operation.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">
                            {operation.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {operation.completed} of {operation.total} completed
                            {operation.failed > 0 && `, ${operation.failed} failed`}
                          </p>
                        </div>
                        <Badge
                          variant={
                            operation.status === 'completed'
                              ? 'default'
                              : operation.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {operation.status}
                        </Badge>
                      </div>
                      <Progress
                        value={(operation.completed / operation.total) * 100}
                        className="h-2"
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
