import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Mail, Download } from 'lucide-react';

interface PDFGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  minutesVersionId: string;
  signatureRequestId?: string;
}

export function PDFGenerationDialog({
  open,
  onOpenChange,
  meetingId,
  minutesVersionId,
  signatureRequestId,
}: PDFGenerationDialogProps) {
  const { toast } = useToast();
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedBrandKit, setSelectedBrandKit] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfHtml, setPdfHtml] = useState('');

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

    // Auto-select default brand kit
    const defaultKit = kits?.find(k => k.is_default);
    if (defaultKit) setSelectedBrandKit(defaultKit.id);
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const { data, error } = await supabase.functions.invoke('generate-branded-pdf', {
        body: {
          meeting_id: meetingId,
          minutes_version_id: minutesVersionId,
          brand_kit_id: selectedBrandKit || undefined,
          signature_request_id: signatureRequestId,
          include_watermark: includeWatermark,
        },
      });

      if (error) throw error;

      setPdfHtml(data.html);

      toast({
        title: 'PDF Generated',
        description: 'Your branded PDF has been created',
      });

      if (sendEmail && selectedProfile) {
        await handleDistribute(data.metadata);
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDistribute = async (metadata: any) => {
    try {
      // In a real implementation, you'd save the PDF first and get a URL
      const mockPdfUrl = 'https://example.com/pdf/meeting-minutes.pdf';

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create PDF generation record
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

      // Distribute
      const { error: distError } = await supabase.functions.invoke('distribute-pdf', {
        body: {
          pdf_generation_id: pdfGen.id,
          distribution_profile_id: selectedProfile,
        },
      });

      if (distError) throw distError;

      toast({
        title: 'Distributed',
        description: 'PDF sent to recipients',
      });
    } catch (error: any) {
      console.error('Error distributing:', error);
      toast({
        title: 'Distribution Error',
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
    a.download = 'meeting-minutes.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Branded PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Brand Kit</Label>
            <Select value={selectedBrandKit} onValueChange={setSelectedBrandKit}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand kit" />
              </SelectTrigger>
              <SelectContent>
                {brandKits.map(kit => (
                  <SelectItem key={kit.id} value={kit.id}>
                    {kit.organization_name} {kit.is_default && '(Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Apply Watermark</Label>
            <Switch checked={includeWatermark} onCheckedChange={setIncludeWatermark} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Email Distribution</Label>
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
          </div>

          {sendEmail && (
            <div className="space-y-2">
              <Label>Distribution Profile</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {pdfHtml && (
            <div className="p-4 bg-muted rounded border">
              <p className="text-sm text-muted-foreground mb-2">PDF ready for download</p>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download HTML
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <FileText className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
