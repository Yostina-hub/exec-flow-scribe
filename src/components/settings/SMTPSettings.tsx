import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Save, TestTube } from 'lucide-react';

export function SMTPSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: 'Meeting Minutes',
    use_tls: true,
    is_active: true,
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          host: data.host,
          port: data.port,
          username: data.username,
          password: data.password,
          from_email: data.from_email,
          from_name: data.from_name,
          use_tls: data.use_tls,
          is_active: data.is_active,
        });
        setSettingsId(data.id);
      }
    } catch (error: any) {
      console.error('Error fetching SMTP settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        ...settings,
        user_id: user.id,
      };

      if (settingsId) {
        const { error } = await supabase
          .from('smtp_settings')
          .update(payload)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      toast({
        title: 'Settings saved',
        description: 'Your SMTP configuration has been saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving SMTP settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save SMTP settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('test-smtp', {
        body: { settings },
      });

      if (error) throw error;

      toast({
        title: 'Test email sent',
        description: 'Check your inbox to verify SMTP configuration',
      });
    } catch (error: any) {
      console.error('Error testing SMTP:', error);
      toast({
        title: 'Test failed',
        description: error.message || 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          SMTP Configuration
        </CardTitle>
        <CardDescription>
          Configure your email server settings for distributing meeting minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Host</Label>
            <Input
              id="host"
              placeholder="smtp.gmail.com"
              value={settings.host}
              onChange={(e) => setSettings({ ...settings, host: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="587"
              value={settings.port}
              onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="your-email@example.com"
            value={settings.username}
            onChange={(e) => setSettings({ ...settings, username: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Your SMTP password or app password"
            value={settings.password}
            onChange={(e) => setSettings({ ...settings, password: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from_email">From Email</Label>
            <Input
              id="from_email"
              type="email"
              placeholder="noreply@example.com"
              value={settings.from_email}
              onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from_name">From Name</Label>
            <Input
              id="from_name"
              placeholder="Meeting Minutes"
              value={settings.from_name}
              onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="use_tls">Use TLS</Label>
          <Switch
            id="use_tls"
            checked={settings.use_tls}
            onCheckedChange={(checked) => setSettings({ ...settings, use_tls: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="is_active">Active</Label>
          <Switch
            id="is_active"
            checked={settings.is_active}
            onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button onClick={handleTest} disabled={testing || !settingsId} variant="outline">
            <TestTube className="w-4 h-4 mr-2" />
            {testing ? 'Testing...' : 'Test'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
