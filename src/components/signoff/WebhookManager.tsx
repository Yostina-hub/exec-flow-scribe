import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Plus, Edit, Trash2, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WebhookManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  headers: Record<string, string>;
  retry_count: number;
  timeout_seconds: number;
}

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  response_status: number | null;
  delivered_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
  distribution_webhooks: {
    name: string;
  };
}

const AVAILABLE_EVENTS = [
  { value: 'distribution.sent', label: 'Distribution Sent' },
  { value: 'distribution.failed', label: 'Distribution Failed' },
  { value: 'approval.requested', label: 'Approval Requested' },
  { value: 'approval.approved', label: 'Approval Approved' },
  { value: 'approval.rejected', label: 'Approval Rejected' },
];

export function WebhookManager({ open, onOpenChange }: WebhookManagerProps) {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[],
    is_active: true,
    headers: '{}',
    retry_count: 3,
    timeout_seconds: 30,
  });

  useEffect(() => {
    if (open) {
      loadWebhooks();
      loadDeliveries();
      subscribeToDeliveries();
    }
  }, [open]);

  const subscribeToDeliveries = () => {
    const channel = supabase
      .channel('webhook_deliveries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_deliveries',
        },
        () => {
          loadDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('distribution_webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks((data as any) || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load webhooks',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*, distribution_webhooks(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDeliveries((data as any) || []);
    } catch (error: any) {
      console.error('Error loading deliveries:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and URL are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.events.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Select at least one event',
        variant: 'destructive',
      });
      return;
    }

    let headers = {};
    try {
      headers = JSON.parse(formData.headers);
    } catch {
      toast({
        title: 'Validation Error',
        description: 'Invalid JSON in headers',
        variant: 'destructive',
      });
      return;
    }

    try {
      const webhookData = {
        name: formData.name,
        url: formData.url,
        secret: formData.secret || null,
        events: formData.events,
        is_active: formData.is_active,
        headers,
        retry_count: formData.retry_count,
        timeout_seconds: formData.timeout_seconds,
      };

      if (editingWebhook) {
        const { error } = await supabase
          .from('distribution_webhooks')
          .update(webhookData)
          .eq('id', editingWebhook.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Webhook updated' });
      } else {
        const { error } = await supabase
          .from('distribution_webhooks')
          .insert(webhookData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Webhook created' });
      }

      setShowForm(false);
      setEditingWebhook(null);
      resetForm();
      loadWebhooks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('distribution_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Webhook deleted' });
      loadWebhooks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret || '',
      events: webhook.events,
      is_active: webhook.is_active,
      headers: JSON.stringify(webhook.headers || {}, null, 2),
      retry_count: webhook.retry_count,
      timeout_seconds: webhook.timeout_seconds,
    });
    setShowForm(true);
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      secret: '',
      events: [],
      is_active: true,
      headers: '{}',
      retry_count: 3,
      timeout_seconds: 30,
    });
  };

  const getDeliveryStatusIcon = (delivery: WebhookDelivery) => {
    if (delivery.delivered_at) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (delivery.failed_at) {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Webhook className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Webhook Management</DialogTitle>
              <DialogDescription>
                Configure webhooks to notify external systems
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="webhooks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="deliveries">Delivery Log</TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-4">
            {!showForm ? (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Manage webhook endpoints for distribution events
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>

                <ScrollArea className="h-[500px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <AlertCircle className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : webhooks.length === 0 ? (
                    <div className="text-center py-8">
                      <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No webhooks configured</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {webhooks.map((webhook) => (
                        <div
                          key={webhook.id}
                          className="p-4 rounded-lg border bg-card space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{webhook.name}</h4>
                                {!webhook.is_active && (
                                  <Badge variant="outline">Inactive</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground font-mono">
                                {webhook.url}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {webhook.events.map((event) => (
                                  <Badge key={event} variant="secondary" className="text-xs">
                                    {event}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(webhook)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(webhook.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Webhook"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>

                <div>
                  <Label>URL *</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>

                <div>
                  <Label>Secret (optional)</Label>
                  <Input
                    type="password"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    placeholder="Used to sign webhooks"
                  />
                </div>

                <div>
                  <Label>Events *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_EVENTS.map((event) => (
                      <div
                        key={event.value}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => toggleEvent(event.value)}
                      >
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.value)}
                          onChange={() => {}}
                          className="cursor-pointer"
                        />
                        <Label className="text-sm cursor-pointer">{event.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Retry Count</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.retry_count}
                      onChange={(e) => setFormData({ ...formData, retry_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Timeout (seconds)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="300"
                      value={formData.timeout_seconds}
                      onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Custom Headers (JSON)</Label>
                  <Textarea
                    value={formData.headers}
                    onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                    placeholder='{"Authorization": "Bearer token"}'
                    rows={3}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingWebhook(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingWebhook ? 'Update' : 'Create'} Webhook
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-4">
            <ScrollArea className="h-[500px]">
              {deliveries.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No deliveries yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getDeliveryStatusIcon(delivery)}
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {delivery.distribution_webhooks?.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {delivery.event_type}
                              </Badge>
                            </div>
                            {delivery.response_status && (
                              <div className="text-xs text-muted-foreground">
                                HTTP {delivery.response_status}
                              </div>
                            )}
                            {delivery.error_message && (
                              <div className="text-xs text-destructive">
                                {delivery.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(delivery.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
