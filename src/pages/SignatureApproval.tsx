import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { localStorageCache } from '@/utils/localStorage';
import { ArrowLeft, FileSignature, Download, Loader2, Languages, BookOpen } from 'lucide-react';
import { detectLanguage } from '@/utils/langDetect';

// Lazy load heavy components
const SignaturePackageViewer = lazy(() => 
  import('@/components/signoff/SignaturePackageViewer').then(module => ({ 
    default: module.SignaturePackageViewer 
  }))
);
const SignOffDialog = lazy(() => 
  import('@/components/signoff/SignOffDialog').then(module => ({ 
    default: module.SignOffDialog 
  }))
);
const NonTechnicalSummaryDialog = lazy(() => 
  import('@/components/NonTechnicalSummaryDialog').then(module => ({ 
    default: module.NonTechnicalSummaryDialog 
  }))
);

export default function SignatureApproval() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [showNonTechnical, setShowNonTechnical] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'am' | 'en' | 'or' | 'so'>('am');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedMinutes, setTranslatedMinutes] = useState<string>('');

  // Check localStorage first for faster initial load
  const cachedRequest = useMemo(() => 
    localStorageCache.get<any>(`signature_request_${requestId}`),
    [requestId]
  );

  // Optimized data fetching with caching
  const fetchSignatureData = useCallback(async () => {
    if (!requestId) return null;

    // Batch all queries together
    const [requestResult, delegationsResult] = await Promise.all([
      supabase
        .from('signature_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle(),
      supabase
        .from('delegation_records')
        .select('*')
        .eq('signature_request_id', requestId)
        .order('delegated_at', { ascending: true })
    ]);

    if (requestResult.error) throw requestResult.error;
    if (!requestResult.data) return null;

    // Fetch profiles in batch
    let formattedDelegations: any[] = [];
    if (delegationsResult.data && delegationsResult.data.length > 0) {
      const userIds = [...new Set([
        ...delegationsResult.data.map(d => d.delegated_from),
        ...delegationsResult.data.map(d => d.delegated_to)
      ])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const userMap = new Map(profiles?.map(p => [p.id, p.full_name || 'Unknown']) || []);
      
      formattedDelegations = delegationsResult.data.map(d => ({
        delegated_from: userMap.get(d.delegated_from) || 'Unknown',
        delegated_to: userMap.get(d.delegated_to) || 'Unknown',
        reason_code: d.reason_code,
        delegated_at: d.delegated_at,
      }));
    }

    const result = {
      request: requestResult.data,
      delegations: formattedDelegations,
    };

    // Cache in localStorage
    localStorageCache.set(`signature_request_${requestId}`, result, 2 * 60 * 1000); // 2 min cache

    return result;
  }, [requestId]);

  const { data, loading: isLoading, refetch } = useOptimizedQuery(
    `signature_${requestId}`,
    fetchSignatureData,
    { 
      enabled: !authLoading && !!user && !!requestId,
      cacheDuration: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Use cached data immediately if available
  const signatureRequest = data?.request ?? cachedRequest?.request;
  const delegationChain = data?.delegations ?? cachedRequest?.delegations ?? [];

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to view this signature request',
        variant: 'destructive',
      });
      navigate('/auth');
    }
  }, [user, authLoading, navigate, toast]);

  const handleSuccess = useCallback(() => {
    // Clear cache and refetch
    localStorageCache.remove(`signature_request_${requestId}`);
    refetch();
    toast({
      title: 'Success',
      description: 'Sign-off processed successfully',
    });
  }, [requestId, refetch, toast]);

  useEffect(() => {
    if (signatureRequest?.package_data?.minutes) {
      const detected = detectLanguage(signatureRequest.package_data.minutes);
      if (detected === 'am' || detected === 'en' || detected === 'or' || detected === 'so') {
        setCurrentLanguage(detected);
      }
    }
  }, [signatureRequest]);

  const handleLanguageToggle = useCallback(async (targetLang: 'am' | 'en' | 'or' | 'so') => {
    if (targetLang === currentLanguage || !signatureRequest?.package_data?.minutes) return;
    
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-minutes', {
        body: {
          content: signatureRequest.package_data.minutes,
          targetLanguage: targetLang,
        },
      });

      if (error) throw error;

      if (data?.translatedContent) {
        setTranslatedMinutes(data.translatedContent);
        setCurrentLanguage(targetLang);
        toast({
          title: 'Translated',
          description: `Minutes translated to ${targetLang === 'am' ? 'Amharic' : targetLang === 'or' ? 'Afaan Oromo' : targetLang === 'so' ? 'Somali' : 'English'}`,
        });
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      toast({
        title: 'Translation Failed',
        description: error.message || 'Failed to translate minutes',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  }, [currentLanguage, signatureRequest, toast]);

  const handleDownloadPDF = useCallback(async () => {
    if (!signatureRequest?.meeting_id) {
      toast({
        title: 'Error',
        description: 'Meeting ID not found',
        variant: 'destructive',
      });
      return;
    }

    // Check cache first
    const cacheKey = `pdf_${signatureRequest.meeting_id}_${requestId}`;
    const cachedPdf = localStorageCache.get<string>(cacheKey);
    
    if (cachedPdf) {
      const blob = new Blob([cachedPdf], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethiotelecom-approved-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    try {
      // Batch queries
      const [minutesResult, brandKitResult] = await Promise.all([
        supabase
          .from('minutes_versions')
          .select('id')
          .eq('meeting_id', signatureRequest.meeting_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('brand_kits')
          .select('id')
          .eq('is_default', true)
          .limit(1)
          .maybeSingle()
      ]);

      if (!minutesResult.data) {
        toast({
          title: 'Error',
          description: 'No minutes found',
          variant: 'destructive',
        });
        return;
      }

      const { data: pdfData, error } = await supabase.functions.invoke('generate-branded-pdf', {
        body: {
          meeting_id: signatureRequest.meeting_id,
          minutes_version_id: minutesResult.data.id,
          brand_kit_id: brandKitResult.data?.id,
          signature_request_id: requestId,
          include_watermark: false,
        },
      });

      if (error) throw error;

      // Cache the PDF for 10 minutes
      localStorageCache.set(cacheKey, pdfData.html, 10 * 60 * 1000);

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
  }, [signatureRequest, requestId, toast]);

  // Memoize computed values
  const canSign = useMemo(() => 
    signatureRequest?.status === 'pending' || signatureRequest?.status === 'delegated',
    [signatureRequest?.status]
  );

  const isApproved = useMemo(() => 
    signatureRequest?.status === 'approved',
    [signatureRequest?.status]
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading signature request...</span>
      </div>
    );
  }

  if (!signatureRequest) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Signature request not found</div>
      </div>
    );
  }

  return (
    <>
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
          <div className="flex gap-2 items-center">
            {signatureRequest?.package_data?.minutes && (
              <>
                <div className="flex gap-1 mr-2">
                  <Button
                    variant={currentLanguage === 'am' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageToggle('am')}
                    disabled={isTranslating}
                  >
                    {isTranslating && currentLanguage !== 'am' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'አማርኛ'
                    )}
                  </Button>
                  <Button
                    variant={currentLanguage === 'en' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageToggle('en')}
                    disabled={isTranslating}
                  >
                    {isTranslating && currentLanguage !== 'en' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'English'
                    )}
                  </Button>
                  <Button
                    variant={currentLanguage === 'or' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageToggle('or')}
                    disabled={isTranslating}
                  >
                    {isTranslating && currentLanguage !== 'or' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Afaan Oromo'
                    )}
                  </Button>
                  <Button
                    variant={currentLanguage === 'so' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLanguageToggle('so')}
                    disabled={isTranslating}
                  >
                    {isTranslating && currentLanguage !== 'so' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Af-Soomaali'
                    )}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNonTechnical(true)}
                  className="gap-2 mr-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Non-Technical
                </Button>
              </>
            )}
            {isApproved && (
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
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          }>
            <SignaturePackageViewer
              packageData={{
                ...signatureRequest.package_data,
                minutes: translatedMinutes || signatureRequest.package_data.minutes
              }}
              status={signatureRequest.status}
              delegationChain={delegationChain}
            />
          </Suspense>
        </div>
      </div>

      {signOffOpen && (
        <Suspense fallback={null}>
          <SignOffDialog
            open={signOffOpen}
            onOpenChange={setSignOffOpen}
            signatureRequestId={requestId!}
            onSuccess={handleSuccess}
          />
        </Suspense>
      )}

      {showNonTechnical && signatureRequest?.package_data?.minutes && (
        <Suspense fallback={null}>
          <NonTechnicalSummaryDialog
            content={translatedMinutes || signatureRequest.package_data.minutes}
            language={currentLanguage}
            meetingTitle="Meeting Minutes"
            open={showNonTechnical}
            onOpenChange={setShowNonTechnical}
          />
        </Suspense>
      )}
    </>
  );
}
