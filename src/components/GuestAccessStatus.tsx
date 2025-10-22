import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, XCircle, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface GuestRequest {
  id: string;
  meeting_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  meeting?: {
    title?: string | null;
    start_time?: string | null;
    status?: string | null;
  } | null;
}

export function GuestAccessStatus() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('my-guest-requests')
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('guest_access_requests')
      .select(`
        *,
        meeting:meetings(title, start_time, status)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const handleCopyLink = async (meetingId: string) => {
    const link = `${window.location.origin}/quick-join/${meetingId}`;
    await navigator.clipboard.writeText(link);
    toast({
      title: "Link copied",
      description: "Quick access link copied to clipboard",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Meeting Access</CardTitle>
        <CardDescription>
          Guest access requests and approved meetings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => {
          const meetingTitle = request.meeting?.title || "Meeting (details unavailable)";
          const meetingStart = request.meeting?.start_time
            ? new Date(request.meeting.start_time).toLocaleString()
            : "Start time unavailable";
          return (
            <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{meetingTitle}</h3>
                  {getStatusBadge(request.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {meetingStart}
                </p>
                {request.status === 'approved' && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ You can now access this meeting
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {request.status === 'approved' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(request.meeting_id)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/quick-join/${request.meeting_id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Join
                    </Button>
                  </>
                )}
                {request.status === 'pending' && (
                  <Button size="sm" variant="outline" disabled>
                    <Clock className="h-4 w-4 mr-1" />
                    Awaiting Approval
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
