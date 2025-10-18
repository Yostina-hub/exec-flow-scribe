import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileSignature, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Shield,
  AudioLines,
  PlayCircle,
  FileAudio,
  AlertCircle,
  Send
} from 'lucide-react';
import { SignOffDialog } from '@/components/signoff/SignOffDialog';
import { AudioPlayer } from '@/components/minutes/AudioPlayer';

interface MeetingSignaturesPanelProps {
  meetingId: string;
}

export function MeetingSignaturesPanel({ meetingId }: MeetingSignaturesPanelProps) {
  const { toast } = useToast();
  const [signatures, setSignatures] = useState<any[]>([]);
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, [meetingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch signature requests for this meeting
      const { data: sigData, error: sigError } = await supabase
        .from('signature_requests')
        .select(`
          *,
          countersignatures(status, required_role, assigned_to),
          delegation_records(delegated_to, reason_code)
        `)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (sigError) throw sigError;
      setSignatures(sigData || []);

      // Fetch audio recordings for this meeting
      const { data: audioData, error: audioError } = await supabase
        .from('meeting_media')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('media_type', 'audio')
        .order('uploaded_at', { ascending: false });

      if (audioError) throw audioError;
      setAudioFiles(audioData || []);
    } catch (error: any) {
      console.error('Error fetching signatures/audio:', error);
      toast({
        title: 'Error',
        description: 'Failed to load signatures and audio',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`meeting-signatures-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signature_requests',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_media',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'delegated':
        return <Shield className="h-4 w-4 text-info" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'delegated':
        return 'secondary';
      default:
        return 'warning';
    }
  };

  const handleDownloadPDF = async (pdfUrl: string) => {
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'signed-minutes.pdf';
      link.click();
      
      toast({
        title: 'Success',
        description: 'PDF download started',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  const handleFollowUp = async (signatureId: string) => {
    try {
      // Create follow-up notification
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          signatureRequestId: signatureId,
          type: 'follow_up',
        },
      });

      if (error) throw error;

      toast({
        title: 'Follow-up sent',
        description: 'Reminder notification has been sent',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send follow-up',
        variant: 'destructive',
      });
    }
  };

  const isAssignedToMe = (signature: any) => {
    if (signature.assigned_to === currentUserId) return true;
    if (signature.countersignatures?.some((cs: any) => cs.assigned_to === currentUserId)) return true;
    return false;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Signature Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Signature Requests
                </CardTitle>
                <CardDescription>
                  Review and approve meeting minutes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {signatures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No signature requests yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                    {signatures.map((sig) => {
                      const assignedToMe = isAssignedToMe(sig);
                      const canSign = assignedToMe && (sig.status === 'pending' || sig.status === 'delegated');
                      const pdfUrl = sig.minutes_versions?.[0]?.pdf_generations?.[0]?.pdf_url ||
                        sig.minutes_versions?.[0]?.pdf_url ||
                        sig.pdf_generations?.[0]?.pdf_url;
                    return (
                      <Card key={sig.id} className={assignedToMe ? 'border-primary' : ''}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(sig.status)}
                                <Badge variant={getStatusColor(sig.status) as any}>
                                  {sig.status}
                                </Badge>
                                {assignedToMe && (
                                  <Badge variant="outline">Assigned to you</Badge>
                                )}
                              </div>

                              <div className="text-sm space-y-1">
                                <p className="text-muted-foreground">
                                  Requested: {new Date(sig.created_at).toLocaleString()}
                                </p>
                                {sig.signed_at && (
                                  <p className="text-muted-foreground">
                                    Signed: {new Date(sig.signed_at).toLocaleString()}
                                  </p>
                                )}
                                {sig.rejection_reason && (
                                  <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded">
                                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                                    <p className="text-sm">{sig.rejection_reason}</p>
                                  </div>
                                )}
                              </div>

                              {/* Countersignatures */}
                              {sig.countersignatures && sig.countersignatures.length > 0 && (
                                <div className="space-y-2 pt-2 border-t">
                                  <p className="text-xs font-semibold text-muted-foreground">
                                    Required Countersignatures:
                                  </p>
                                  {sig.countersignatures.map((cs: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      {getStatusIcon(cs.status)}
                                      <span>{cs.required_role}</span>
                                      <Badge variant="outline" className="ml-auto">
                                        {cs.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              {canSign && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSignature(sig.id);
                                    setSignOffOpen(true);
                                  }}
                                >
                                  <FileSignature className="h-4 w-4 mr-2" />
                                  Review & Sign
                                </Button>
                              )}
                              
                              {pdfUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadPDF(pdfUrl)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </Button>
                              )}

                              {sig.status === 'pending' && !assignedToMe && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleFollowUp(sig.id)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Follow Up
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Audio Recordings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AudioLines className="h-5 w-5" />
              Meeting Recordings
            </CardTitle>
            <CardDescription>
              Audio recordings from this meeting
            </CardDescription>
          </CardHeader>
          <CardContent>
            {audioFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileAudio className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No recordings available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {audioFiles.map((audio) => (
                  <Card key={audio.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileAudio className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {audio.format?.toUpperCase() || 'Audio'} Recording
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(audio.uploaded_at).toLocaleString()}
                              {audio.duration_seconds && (
                                <> • {Math.floor(audio.duration_seconds / 60)}:{(audio.duration_seconds % 60).toString().padStart(2, '0')}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={selectedAudio === audio.file_url ? 'default' : 'outline'}
                          onClick={() => setSelectedAudio(selectedAudio === audio.file_url ? null : audio.file_url)}
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {selectedAudio === audio.file_url ? 'Hide Player' : 'Play'}
                        </Button>
                      </div>

                      {selectedAudio === audio.file_url && (
                        <div className="mt-4 pt-4 border-t">
                          <AudioPlayer audioUrl={audio.file_url} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedSignature && (
        <SignOffDialog
          open={signOffOpen}
          onOpenChange={setSignOffOpen}
          signatureRequestId={selectedSignature}
          onSuccess={() => {
            fetchData();
            setSignOffOpen(false);
            setSelectedSignature(null);
          }}
        />
      )}
    </>
  );
}
