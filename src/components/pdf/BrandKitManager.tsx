import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Palette, Upload, Save } from 'lucide-react';

interface BrandKit {
  id: string;
  organization_name: string;
  logo_url?: string;
  header_template?: string;
  footer_template?: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  watermark_text: string;
  is_default: boolean;
}

export function BrandKitManager() {
  const { toast } = useToast();
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [editingKit, setEditingKit] = useState<Partial<BrandKit>>({
    organization_name: '',
    color_primary: '#000000',
    color_secondary: '#666666',
    color_accent: '#0066cc',
    watermark_text: 'INTERNAL USE ONLY',
    is_default: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchBrandKits();
  }, []);

  const fetchBrandKits = async () => {
    const { data, error } = await supabase
      .from('brand_kits')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBrandKits(data);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!editingKit.organization_name) {
        toast({ title: 'Error', description: 'Organization name is required', variant: 'destructive' });
        return;
      }

      const insertData: any = {
        ...editingKit,
        created_by: user.id,
      };
      
      const { error } = await supabase.from('brand_kits').insert(insertData);

      if (error) throw error;

      toast({ title: 'Success', description: 'Brand kit saved' });
      fetchBrandKits();
      setEditingKit({
        organization_name: '',
        color_primary: '#000000',
        color_secondary: '#666666',
        color_accent: '#0066cc',
        watermark_text: 'INTERNAL USE ONLY',
        is_default: false,
      });
    } catch (error: any) {
      console.error('Error saving brand kit:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Brand Kit Manager</h3>
      </div>

      {/* Existing Brand Kits */}
      {brandKits.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="font-semibold text-sm">Existing Brand Kits</h4>
          {brandKits.map((kit) => (
            <Card key={kit.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{kit.organization_name}</div>
                  <div className="flex gap-2 mt-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: kit.color_primary }}
                      title="Primary"
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: kit.color_secondary }}
                      title="Secondary"
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: kit.color_accent }}
                      title="Accent"
                    />
                  </div>
                </div>
                {kit.is_default && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create New Brand Kit */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-semibold text-sm">Create New Brand Kit</h4>

        <div className="space-y-2">
          <Label>Organization Name *</Label>
          <Input
            value={editingKit.organization_name}
            onChange={(e) => setEditingKit({ ...editingKit, organization_name: e.target.value })}
            placeholder="Your Organization"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={editingKit.color_primary}
                onChange={(e) => setEditingKit({ ...editingKit, color_primary: e.target.value })}
                className="w-16 h-10"
              />
              <Input
                value={editingKit.color_primary}
                onChange={(e) => setEditingKit({ ...editingKit, color_primary: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={editingKit.color_secondary}
                onChange={(e) => setEditingKit({ ...editingKit, color_secondary: e.target.value })}
                className="w-16 h-10"
              />
              <Input
                value={editingKit.color_secondary}
                onChange={(e) => setEditingKit({ ...editingKit, color_secondary: e.target.value })}
                placeholder="#666666"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={editingKit.color_accent}
                onChange={(e) => setEditingKit({ ...editingKit, color_accent: e.target.value })}
                className="w-16 h-10"
              />
              <Input
                value={editingKit.color_accent}
                onChange={(e) => setEditingKit({ ...editingKit, color_accent: e.target.value })}
                placeholder="#0066cc"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo URL</Label>
          <Input
            value={editingKit.logo_url || ''}
            onChange={(e) => setEditingKit({ ...editingKit, logo_url: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div className="space-y-2">
          <Label>Header Template (HTML)</Label>
          <Textarea
            value={editingKit.header_template || ''}
            onChange={(e) => setEditingKit({ ...editingKit, header_template: e.target.value })}
            placeholder="<div>Meeting Minutes</div>"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Footer Template (HTML)</Label>
          <Textarea
            value={editingKit.footer_template || ''}
            onChange={(e) => setEditingKit({ ...editingKit, footer_template: e.target.value })}
            placeholder="<div>Confidential</div>"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Watermark Text</Label>
          <Input
            value={editingKit.watermark_text}
            onChange={(e) => setEditingKit({ ...editingKit, watermark_text: e.target.value })}
            placeholder="INTERNAL USE ONLY"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={editingKit.is_default}
              onCheckedChange={(checked) => setEditingKit({ ...editingKit, is_default: checked })}
            />
            <Label>Set as Default</Label>
          </div>

          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Brand Kit'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
