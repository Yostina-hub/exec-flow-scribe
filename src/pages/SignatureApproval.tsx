import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SignaturePackageViewer } from '@/components/signoff/SignaturePackageViewer';
import { SignOffDialog } from '@/components/signoff/SignOffDialog';
import { ArrowLeft, FileSignature, Download } from 'lucide-react';

export default function SignatureApproval() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [signatureRequest, setSignatureRequest] = useState<any>(null);
  const [delegationChain, setDelegationChain] = useState<any[]>([]);

  useEffect(() => {
    if (requestId) {
      fetchSignatureRequest();
    }
  }, [requestId]);

  const fetchSignatureRequest = async () => {
    try {
      setIsLoading(true);

      // Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to view this signature request',
          variant: 'destructive',
        });
        navigate('/auth');
        return;
      }

      // Fetch signature request
      const { data: request, error: requestError } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (requestError) throw requestError;
      
      if (!request) {
        toast({
          title: 'Not Found',
          description: 'This signature request does not exist',
          variant: 'destructive',
        });
        navigate('/meetings');
        return;
      }

      setSignatureRequest(request);

      // Fetch delegation chain
      const { data: delegations, error: delegError } = await supabase
        .from('delegation_records')
        .select('*')
        .eq('signature_request_id', requestId)
        .order('delegated_at', { ascending: true });

      if (!delegError && delegations) {
        // Fetch user profiles separately
        const userIds = [...new Set([
          ...delegations.map(d => d.delegated_from),
          ...delegations.map(d => d.delegated_to)
        ])];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        const userMap = new Map(profiles?.map(p => [p.id, p.full_name || 'Unknown']) || []);
        
        const formattedDelegations = delegations.map(d => ({
          delegated_from: userMap.get(d.delegated_from) || 'Unknown',
          delegated_to: userMap.get(d.delegated_to) || 'Unknown',
          reason_code: d.reason_code,
          delegated_at: d.delegated_at,
        }));
        setDelegationChain(formattedDelegations);
      }
    } catch (error: any) {
      console.error('Error fetching signature request:', error);
      toast({
        title: 'Error',
        description: 'Failed to load signature request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    fetchSignatureRequest();
    toast({
      title: 'Success',
      description: 'Sign-off processed successfully',
    });
  };

  const handleDownloadPDF = async () => {
    try {
      if (!signatureRequest?.meeting_id) {
        toast({
          title: 'Error',
          description: 'Meeting ID not found',
          variant: 'destructive',
        });
        return;
      }

      // Get latest minutes version
      const { data: latestMinutes } = await supabase
        .from('minutes_versions')
        .select('id')
        .eq('meeting_id', signatureRequest.meeting_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestMinutes) {
        toast({
          title: 'Error',
          description: 'No minutes found',
          variant: 'destructive',
        });
        return;
      }

      // Fetch default Ethio Telecom brand kit
      const { data: brandKits } = await supabase
        .from('brand_kits')
        .select('id')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();

      // Generate branded PDF with approval stamp
      const { data: pdfData, error } = await supabase.functions.invoke('generate-branded-pdf', {
        body: {
          meeting_id: signatureRequest.meeting_id,
          minutes_version_id: latestMinutes.id,
          brand_kit_id: brandKits?.id,
          signature_request_id: requestId,
          include_watermark: false,
        },
      });

      if (error) throw error;

      // Download the branded Ethio Telecom PDF
      const blob = new Blob([pdfData.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethiotelecom-approved-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '✓ Branded PDF Downloaded',
        description: 'Ethio Telecom approved minutes saved',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading signature request...</div>
        </div>
      </Layout>
    );
  }

  if (!signatureRequest) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Signature request not found</div>
        </div>
      </Layout>
    );
  }

  const canSign = signatureRequest.status === 'pending' || signatureRequest.status === 'delegated';

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Signature Approval</h1>
              <p className="text-sm text-muted-foreground">
                Review and sign-off on meeting minutes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {signatureRequest.status === 'approved' && (
              <Button onClick={handleDownloadPDF} size="lg" variant="outline">
                <Download className="w-5 h-5 mr-2" />
                Download Approved PDF
              </Button>
            )}
            {canSign && (
              <Button onClick={() => setSignOffOpen(true)} size="lg">
                <FileSignature className="w-5 h-5 mr-2" />
                Review & Sign
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <SignaturePackageViewer
            packageData={signatureRequest.package_data}
            status={signatureRequest.status}
            delegationChain={delegationChain}
          />
        </div>
      </div>

      <SignOffDialog
        open={signOffOpen}
        onOpenChange={setSignOffOpen}
        signatureRequestId={requestId!}
        onSuccess={handleSuccess}
      />
    </Layout>
  );
}
