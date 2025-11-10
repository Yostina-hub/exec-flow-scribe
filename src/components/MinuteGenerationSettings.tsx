import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Zap } from 'lucide-react';

export const MinuteGenerationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chunkDuration, setChunkDuration] = useState(5);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('minute_generation_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setChunkDuration(data.chunk_duration_minutes);
        setAutoGenerate(data.auto_generate_enabled);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('minute_generation_settings')
        .upsert({
          user_id: user.id,
          chunk_duration_minutes: chunkDuration,
          auto_generate_enabled: autoGenerate,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: `Minutes will be generated in ${chunkDuration}-minute chunks`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Minute Generation Settings</CardTitle>
        </div>
        <CardDescription>
          Configure how meeting minutes are automatically generated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-generate">Auto-Generate Minutes</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate minutes when recording stops
              </p>
            </div>
            <Switch
              id="auto-generate"
              checked={autoGenerate}
              onCheckedChange={setAutoGenerate}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <Label>Chunk Duration: {chunkDuration} minutes</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Meetings are processed in chunks for faster generation. Smaller chunks mean faster processing but more frequent AI calls.
            </p>
            <Slider
              value={[chunkDuration]}
              onValueChange={(values) => setChunkDuration(values[0])}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min (fastest)</span>
              <span>15 min</span>
              <span>30 min (slowest)</span>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">💡 Recommendation</p>
            <p className="text-sm text-muted-foreground">
              For optimal performance:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• 5 minutes: Best for meetings up to 1 hour</li>
              <li>• 10 minutes: Good for meetings 1-2 hours</li>
              <li>• 15-20 minutes: Suitable for very long meetings (2+ hours)</li>
            </ul>
          </div>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};