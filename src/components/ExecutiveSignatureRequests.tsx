import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSignature, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SignOffDialog } from '@/components/signoff/SignOffDialog';
import { useNavigate } from 'react-router-dom';

interface SignatureRequest {
  id: string;
  meeting_id: string;
  status: string;
  created_at: string;
  package_data: any;
  rejection_reason?: string;
  meetings?: {
    title: string;
    start_time: string;
  };
}

export function ExecutiveSignatureRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [signOffOpen, setSignOffOpen] = useState(false);

  const fetchSignatureRequests = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('signature_requests')
        .select(`
          *,
          meetings (
            title,
            start_time
          )
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching signature requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load signature requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatureRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('signature_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signature_requests',
          filter: `assigned_to=eq.${user?.id}`,
        },
        () => {
          fetchSignatureRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSignOff = (requestId: string) => {
    setSelectedRequestId(requestId);
    setSignOffOpen(true);
  };

  const handleViewDetails = (requestId: string) => {
    navigate(`/signature/${requestId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'delegated':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'delegated':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  if (loading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Pending Signature Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Signature Requests
              </CardTitle>
              <CardDescription>
                {pendingRequests.length > 0
                  ? `${pendingRequests.length} request${pendingRequests.length > 1 ? 's' : ''} awaiting your signature`
                  : 'No pending signature requests'}
              </CardDescription>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="h-6 px-2">
                {pendingRequests.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No signature requests found</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {requests.map((request) => (
                  <Card
                    key={request.id}
                    className={`hover:shadow-md transition-shadow ${
                      request.status === 'pending' ? 'border-yellow-500/30' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">
                              {request.meetings?.title || 'Unknown Meeting'}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {request.meetings?.start_time
                                  ? new Date(request.meetings.start_time).toLocaleDateString()
                                  : 'TBD'}
                              </span>
                              <span>•</span>
                              <span>
                                Requested {new Date(request.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant={getStatusColor(request.status) as any}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </span>
                          </Badge>
                        </div>

                        {request.rejection_reason && (
                          <div className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            <span className="font-semibold">Rejection reason:</span>{' '}
                            {request.rejection_reason}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(request.id)}
                            className="flex-1"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          {request.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleSignOff(request.id)}
                              className="flex-1"
                            >
                              <FileSignature className="h-3 w-3 mr-1" />
                              Sign Off
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {selectedRequestId && (
        <SignOffDialog
          open={signOffOpen}
          onOpenChange={setSignOffOpen}
          signatureRequestId={selectedRequestId}
          onSuccess={() => {
            fetchSignatureRequests();
            toast({
              title: 'Success',
              description: 'Signature request processed successfully',
            });
          }}
        />
      )}
    </>
  );
}
