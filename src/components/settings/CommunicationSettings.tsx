import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MessageSquare, Phone, Mail, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WhatsAppConfig {
  api_endpoint?: string;
  api_key?: string;
  business_phone?: string;
  webhook_url?: string;
}

interface SMSConfig {
  provider?: 'ethio_telecom' | 'africa_talking' | 'twilio';
  api_key?: string;
  sender_id?: string;
  api_endpoint?: string;
}

interface FreePBXConfig {
  server_url?: string;
  api_key?: string;
  extension?: string;
  caller_id?: string;
}

type CommunicationConfig = WhatsAppConfig | SMSConfig | FreePBXConfig;

interface UrgentKeyword {
  id: string;
  keyword: string;
  priority_level: number;
  auto_escalate: boolean;
  is_active: boolean;
}

interface EscalationRule {
  id: string;
  rule_name: string;
  priority_level: number;
  wait_time_minutes: number;
  escalate_to: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function CommunicationSettings() {
  const [configs, setConfigs] = useState<Record<string, CommunicationConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keywords, setKeywords] = useState<UrgentKeyword[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordPriority, setNewKeywordPriority] = useState(3);

  useEffect(() => {
    loadConfigs();
    loadKeywords();
    loadRules();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('communication_settings')
        .select('*');

      if (error) throw error;

      const configMap: Record<string, CommunicationConfig> = {};
      data?.forEach(setting => {
        configMap[setting.setting_type] = setting.config as CommunicationConfig;
      });
      
      setConfigs(configMap);
    } catch (error: any) {
      toast.error('Failed to load communication settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadKeywords = async () => {
    try {
      const { data, error } = await supabase
        .from('urgent_keywords')
        .select('*')
        .order('priority_level', { ascending: false });

      if (error) throw error;
      setKeywords(data || []);
    } catch (error: any) {
      console.error('Failed to load keywords:', error);
    }
  };

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('priority_level', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error('Failed to load escalation rules:', error);
    }
  };

  const saveConfig = async (settingType: string, config: CommunicationConfig) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('communication_settings')
        .upsert({
          setting_type: settingType,
          config: config as any,
          is_active: true
        } as any);

      if (error) throw error;

      toast.success(`${settingType.toUpperCase()} configuration saved`);
      setConfigs(prev => ({ ...prev, [settingType]: config }));
    } catch (error: any) {
      toast.error('Failed to save configuration');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }

    try {
      const { error } = await supabase
        .from('urgent_keywords')
        .insert({
          keyword: newKeyword.toLowerCase().trim(),
          priority_level: newKeywordPriority,
          auto_escalate: true,
          is_active: true
        });

      if (error) throw error;

      toast.success('Keyword added successfully');
      setNewKeyword('');
      loadKeywords();
    } catch (error: any) {
      toast.error('Failed to add keyword');
      console.error(error);
    }
  };

  const deleteKeyword = async (id: string) => {
    try {
      const { error } = await supabase
        .from('urgent_keywords')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Keyword deleted');
      loadKeywords();
    } catch (error: any) {
      toast.error('Failed to delete keyword');
      console.error(error);
    }
  };

  const toggleKeyword = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('urgent_keywords')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadKeywords();
    } catch (error: any) {
      toast.error('Failed to update keyword');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Communication Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure WhatsApp, SMS, and FreePBX call center integration for automated notifications and escalations
        </p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="whatsapp">
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="sms">
            <Mail className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="freepbx">
            <Phone className="h-4 w-4 mr-2" />
            FreePBX
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <AlertCircle className="h-4 w-4 mr-2" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="escalation">
            Escalation
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Settings */}
        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business API</CardTitle>
              <CardDescription>
                Configure WhatsApp Business API for in-app messaging with keyword detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wa-endpoint">API Endpoint</Label>
                <Input
                  id="wa-endpoint"
                  placeholder="https://api.whatsapp.com/..."
                  value={(configs.whatsapp as WhatsAppConfig)?.api_endpoint || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    whatsapp: { ...(prev.whatsapp as WhatsAppConfig), api_endpoint: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-api-key">API Key / Token</Label>
                <Input
                  id="wa-api-key"
                  type="password"
                  placeholder="Enter your WhatsApp API key"
                  value={(configs.whatsapp as WhatsAppConfig)?.api_key || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    whatsapp: { ...(prev.whatsapp as WhatsAppConfig), api_key: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-phone">Business Phone Number</Label>
                <Input
                  id="wa-phone"
                  placeholder="+251912345678"
                  value={(configs.whatsapp as WhatsAppConfig)?.business_phone || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    whatsapp: { ...(prev.whatsapp as WhatsAppConfig), business_phone: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-webhook">Webhook URL (for incoming messages)</Label>
                <Input
                  id="wa-webhook"
                  placeholder="https://your-domain.com/webhook/whatsapp"
                  value={(configs.whatsapp as WhatsAppConfig)?.webhook_url || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    whatsapp: { ...(prev.whatsapp as WhatsAppConfig), webhook_url: e.target.value }
                  }))}
                />
              </div>

              <Button
                onClick={() => saveConfig('whatsapp', (configs.whatsapp || {}) as WhatsAppConfig)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save WhatsApp Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Settings */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Gateway Configuration</CardTitle>
              <CardDescription>
                Configure SMS provider for Ethiopian context (Ethio Telecom, Africa's Talking, or Twilio)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sms-provider">SMS Provider</Label>
                <select
                  id="sms-provider"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(configs.sms as SMSConfig)?.provider || 'ethio_telecom'}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    sms: { ...(prev.sms as SMSConfig), provider: e.target.value as any }
                  }))}
                >
                  <option value="ethio_telecom">Ethio Telecom SMS</option>
                  <option value="africa_talking">Africa's Talking</option>
                  <option value="twilio">Twilio</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms-api-key">API Key / Username</Label>
                <Input
                  id="sms-api-key"
                  type="password"
                  placeholder="Enter your SMS API key"
                  value={(configs.sms as SMSConfig)?.api_key || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    sms: { ...(prev.sms as SMSConfig), api_key: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms-sender">Sender ID / Short Code</Label>
                <Input
                  id="sms-sender"
                  placeholder="e.g., 8000 or MEETINGHUB"
                  value={(configs.sms as SMSConfig)?.sender_id || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    sms: { ...(prev.sms as SMSConfig), sender_id: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms-endpoint">API Endpoint (if custom)</Label>
                <Input
                  id="sms-endpoint"
                  placeholder="https://api.provider.com/sms"
                  value={(configs.sms as SMSConfig)?.api_endpoint || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    sms: { ...(prev.sms as SMSConfig), api_endpoint: e.target.value }
                  }))}
                />
              </div>

              <Button
                onClick={() => saveConfig('sms', (configs.sms || {}) as SMSConfig)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save SMS Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FreePBX Settings */}
        <TabsContent value="freepbx" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FreePBX Call Center Integration</CardTitle>
              <CardDescription>
                Configure FreePBX server for automated calls and escalations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pbx-url">FreePBX Server URL</Label>
                <Input
                  id="pbx-url"
                  placeholder="https://your-freepbx.com or IP:Port"
                  value={(configs.freepbx as FreePBXConfig)?.server_url || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    freepbx: { ...(prev.freepbx as FreePBXConfig), server_url: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pbx-api-key">API Key / Auth Token</Label>
                <Input
                  id="pbx-api-key"
                  type="password"
                  placeholder="Enter FreePBX API key"
                  value={(configs.freepbx as FreePBXConfig)?.api_key || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    freepbx: { ...(prev.freepbx as FreePBXConfig), api_key: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pbx-extension">Extension Number</Label>
                <Input
                  id="pbx-extension"
                  placeholder="e.g., 1000"
                  value={(configs.freepbx as FreePBXConfig)?.extension || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    freepbx: { ...(prev.freepbx as FreePBXConfig), extension: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pbx-caller-id">Caller ID</Label>
                <Input
                  id="pbx-caller-id"
                  placeholder="+251911234567"
                  value={(configs.freepbx as FreePBXConfig)?.caller_id || ''}
                  onChange={(e) => setConfigs(prev => ({
                    ...prev,
                    freepbx: { ...(prev.freepbx as FreePBXConfig), caller_id: e.target.value }
                  }))}
                />
              </div>

              <Button
                onClick={() => saveConfig('freepbx', (configs.freepbx || {}) as FreePBXConfig)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save FreePBX Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Urgent Keywords */}
        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Urgent Keywords Management</CardTitle>
              <CardDescription>
                Configure keywords that trigger urgent notifications and auto-escalation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add keyword (e.g., urgent, ፍጹም)"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Input
                  type="number"
                  min="1"
                  max="5"
                  className="w-24"
                  value={newKeywordPriority}
                  onChange={(e) => setNewKeywordPriority(parseInt(e.target.value))}
                  placeholder="Priority"
                />
                <Button onClick={addKeyword}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Auto-Escalate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((keyword) => (
                    <TableRow key={keyword.id}>
                      <TableCell className="font-medium">{keyword.keyword}</TableCell>
                      <TableCell>
                        <Badge variant={keyword.priority_level >= 4 ? 'destructive' : 'default'}>
                          Level {keyword.priority_level}
                        </Badge>
                      </TableCell>
                      <TableCell>{keyword.auto_escalate ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={keyword.is_active}
                          onCheckedChange={() => toggleKeyword(keyword.id, keyword.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteKeyword(keyword.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalation Rules */}
        <TabsContent value="escalation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Rules</CardTitle>
              <CardDescription>
                Define automatic escalation paths: WhatsApp → SMS → Call
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead>Escalate To</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.rule_name}</TableCell>
                      <TableCell>
                        <Badge variant={rule.priority_level >= 4 ? 'destructive' : 'default'}>
                          P{rule.priority_level}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.wait_time_minutes} min</TableCell>
                      <TableCell className="capitalize">{rule.escalate_to}</TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">How Escalation Works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Message sent via WhatsApp initially</li>
                  <li>If not read within configured time, escalate to SMS</li>
                  <li>If still no response, initiate FreePBX call</li>
                  <li>Priority level determines escalation speed</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}