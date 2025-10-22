import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, UserCheck, Link as LinkIcon, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GuestRequest {
  id: string;
  user_id: string;
  meeting_id: string;
  full_name: string;
  email: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  meeting: {
    title: string;
    start_time: string;
  };
  reviewed_by?: string;
  reviewed_at?: string;
}

export function GuestApprovalTab() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('guest-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_access_requests'
        },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('guest_access_requests')
      .select(`
        *,
        meeting:meetings(title, start_time)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const handleApprove = async (request: GuestRequest) => {
    setProcessing(request.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update request status
      const { error: updateError } = await supabase
        .from('guest_access_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Add guest to meeting_attendees
      const { error: attendeeError } = await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: request.meeting_id,
          user_id: request.user_id,
          attended: false
        });

      if (attendeeError) throw attendeeError;

      // Generate quick access link
      const quickLink = `${window.location.origin}/quick-join/${request.meeting_id}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(quickLink);

      toast({
        title: "Guest approved",
        description: `${request.full_name} has been granted access. Quick link copied to clipboard!`,
      });
    } catch (error: any) {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: GuestRequest) => {
    setProcessing(request.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('guest_access_requests')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Guest rejected",
        description: `Access request from ${request.full_name} has been rejected.`,
      });
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const RequestsTable = ({ requests }: { requests: GuestRequest[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Guest</TableHead>
          <TableHead>Meeting</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No requests found
            </TableCell>
          </TableRow>
        ) : (
          requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{request.full_name}</div>
                  <div className="text-sm text-muted-foreground">{request.email}</div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{request.meeting.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(request.meeting.start_time).toLocaleDateString()}
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                {request.reason || <span className="text-muted-foreground">No reason provided</span>}
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request)}
                      disabled={processing === request.id}
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(request)}
                      disabled={processing === request.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
                {request.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const link = `${window.location.origin}/quick-join/${request.meeting_id}`;
                      await navigator.clipboard.writeText(link);
                      toast({
                        title: "Link copied",
                        description: "Quick access link copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </Button>
                )}
                {request.status === 'rejected' && (
                  <span className="text-sm text-muted-foreground">
                    {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          <CardTitle>Guest Access Approvals</CardTitle>
        </div>
        <CardDescription>
          Review and approve guest access requests to meetings
        </CardDescription>
        <Alert className="mt-4">
          <LinkIcon className="h-4 w-4" />
          <AlertDescription>
            When you approve a guest, a quick access link will be automatically copied to your clipboard. Share this link with the guest to give them direct access to the meeting.
          </AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <RequestsTable requests={pendingRequests} />
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <RequestsTable requests={approvedRequests} />
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            <RequestsTable requests={rejectedRequests} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
