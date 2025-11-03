import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Mail, Download, Eye, Sparkles, Shield, Palette, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface EnhancedPDFGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  minutesVersionId: string;
  signatureRequestId?: string;
}

export function EnhancedPDFGenerationDialog({
  open,
  onOpenChange,
  meetingId,
  minutesVersionId,
  signatureRequestId,
}: EnhancedPDFGenerationDialogProps) {
  const { toast } = useToast();
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedBrandKit, setSelectedBrandKit] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    const { data: kits } = await supabase.from('brand_kits').select('*');
    const { data: profs } = await supabase.from('distribution_profiles').select('*');

    if (kits) setBrandKits(kits);
    if (profs) setProfiles(profs);

    const defaultKit = kits?.find(k => k.is_default);
    if (defaultKit) setSelectedBrandKit(defaultKit.id);
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(10);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const { data, error } = await supabase.functions.invoke('generate-branded-pdf', {
        body: {
          meeting_id: meetingId,
          minutes_version_id: minutesVersionId,
          brand_kit_id: selectedBrandKit || undefined,
          signature_request_id: signatureRequestId,
          include_watermark: includeWatermark,
        },
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;

      setPdfHtml(data.html);

      toast({
        title: '✨ PDF Generated Successfully',
        description: 'Your beautifully formatted PDF is ready',
      });

      if (sendEmail && selectedProfile) {
        await handleDistribute(data.metadata);
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleDistribute = async (metadata: any) => {
    try {
      const mockPdfUrl = 'https://example.com/pdf/meeting-minutes.pdf';

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: pdfGen, error: pdfError } = await supabase
        .from('pdf_generations')
        .insert({
          meeting_id: meetingId,
          minutes_version_id: minutesVersionId,
          brand_kit_id: selectedBrandKit || null,
          pdf_url: mockPdfUrl,
          approval_stamp: metadata.approval_stamp || {},
          watermark_applied: includeWatermark ? 'INTERNAL USE ONLY' : null,
          exhibits_included: metadata.exhibits_included || 0,
          generated_by: user.id,
        })
        .select()
        .single();

      if (pdfError) throw pdfError;

      const { error: distError } = await supabase.functions.invoke('distribute-pdf', {
        body: {
          pdf_generation_id: pdfGen.id,
          distribution_profile_id: selectedProfile,
        },
      });

      if (distError) throw distError;

      toast({
        title: '📧 PDF Distributed',
        description: 'Document sent to all recipients',
      });
    } catch (error: any) {
      console.error('Error distributing:', error);
      toast({
        title: 'Distribution Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([pdfHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-minutes-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(pdfHtml);
      win.document.close();
    }
  };

  const selectedKit = brandKits.find(k => k.id === selectedBrandKit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold">Generate Professional PDF</div>
              <div className="text-sm font-normal text-muted-foreground">
                Create beautifully formatted meeting minutes
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="design" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="design" className="gap-2">
              <Palette className="w-4 h-4" />
              Design
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-2">
              <Mail className="w-4 h-4" />
              Distribution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Brand Kit</Label>
              <Select value={selectedBrandKit} onValueChange={setSelectedBrandKit}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Select brand kit" />
                </SelectTrigger>
                <SelectContent>
                  {brandKits.map(kit => (
                    <SelectItem key={kit.id} value={kit.id} className="py-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full border-2"
                          style={{ backgroundColor: kit.color_primary }}
                        />
                        <span className="font-medium">{kit.organization_name}</span>
                        {kit.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedKit && (
                <div className="p-4 rounded-lg border bg-gradient-to-br from-background to-muted/30">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">COLOR PREVIEW</div>
                  <div className="flex gap-2">
                    <div 
                      className="w-12 h-12 rounded-lg shadow-md border-2 border-white"
                      style={{ backgroundColor: selectedKit.color_primary }}
                    />
                    <div 
                      className="w-12 h-12 rounded-lg shadow-md border-2 border-white"
                      style={{ backgroundColor: selectedKit.color_secondary || selectedKit.color_primary }}
                    />
                    <div 
                      className="w-12 h-12 rounded-lg shadow-md border-2 border-white"
                      style={{ backgroundColor: selectedKit.color_accent }}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-br from-background to-muted/30">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <Label className="font-semibold">Watermark Protection</Label>
                    <p className="text-sm text-muted-foreground">
                      Add security watermark to prevent unauthorized distribution
                    </p>
                  </div>
                </div>
                <Switch checked={includeWatermark} onCheckedChange={setIncludeWatermark} />
              </div>

              {includeWatermark && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="text-sm font-medium mb-2">Watermark Preview</div>
                  <div className="relative h-24 rounded-md bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <span className="text-4xl font-black rotate-[-45deg] text-slate-600">
                        {selectedKit?.watermark_text || 'CONFIDENTIAL'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground relative z-10">Sample Document Content</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <Label className="font-semibold">Email Distribution</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically send PDF to recipients
                  </p>
                </div>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>

            {sendEmail && (
              <div className="space-y-3">
                <Label>Distribution Profile</Label>
                <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {profile.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {pdfHtml && (
          <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">PDF Ready</div>
                  <div className="text-xs text-muted-foreground">Your document is generated</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePreview} variant="outline" size="sm" className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleDownload} size="sm" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-3 p-4 rounded-lg border bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Generating PDF...</span>
              <span className="text-muted-foreground">{generationProgress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !selectedBrandKit}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
