import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, Unlink, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface IntegrationManagerProps {
  meetingId: string;
}

export const IntegrationManager = ({ meetingId }: IntegrationManagerProps) => {
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [integrationType, setIntegrationType] = useState("");
  const [externalId, setExternalId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const { data: integrations, refetch } = useQuery({
    queryKey: ['meeting-integrations', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_integrations')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const createIntegration = async () => {
    setCreating(true);
    try {
      const { error } = await supabase
        .from('meeting_integrations')
        .insert({
          meeting_id: meetingId,
          integration_type: integrationType,
          external_id: externalId,
          external_url: externalUrl || null,
          sync_status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Integration created",
        description: `${integrationType} has been linked`
      });

      setIntegrationOpen(false);
      setIntegrationType("");
      setExternalId("");
      setExternalUrl("");
      refetch();
    } catch (error) {
      console.error('Error creating integration:', error);
      toast({
        title: "Failed to create integration",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const syncIntegration = async (integrationId: string) => {
    const { error } = await supabase
      .from('meeting_integrations')
      .update({ 
        last_synced_at: new Date().toISOString(),
        sync_status: 'active'
      })
      .eq('id', integrationId);

    if (error) {
      toast({
        title: "Sync failed",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Synced successfully"
      });
      refetch();
    }
  };

  const removeIntegration = async (integrationId: string) => {
    const { error } = await supabase
      .from('meeting_integrations')
      .delete()
      .eq('id', integrationId);

    if (error) {
      toast({
        title: "Failed to remove",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Integration removed"
      });
      refetch();
    }
  };

  const syncWithTeams = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('teams-sync', {
        body: {
          meetingId,
          action: 'create',
          teamsData: {
            accessToken: prompt('Enter Microsoft Teams access token:')
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Teams integration created',
        description: 'Meeting synced with Microsoft Teams'
      });

      refetch();
    } catch (error) {
      console.error('Teams sync error:', error);
      toast({
        title: 'Teams sync failed',
        variant: 'destructive'
      });
    }
  };

  const syncWithOutlook = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-sync', {
        body: {
          meetingId,
          action: 'create',
          outlookData: {
            accessToken: prompt('Enter Outlook access token:')
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Outlook integration created',
        description: 'Meeting synced with Outlook Calendar'
      });

      refetch();
    } catch (error) {
      console.error('Outlook sync error:', error);
      toast({
        title: 'Outlook sync failed',
        variant: 'destructive'
      });
    }
  };

  const integrationTypes = [
    { value: 'google_drive', label: 'Google Drive' },
    { value: 'teledrive', label: 'TeleDrive (Telegram)' },
    { value: 'google_meet', label: 'Google Meet' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'teams', label: 'Microsoft Teams' },
    { value: 'outlook', label: 'Outlook Calendar' },
    { value: 'whatsapp', label: 'WhatsApp Business' },
    { value: 'slack', label: 'Slack' },
    { value: 'jira', label: 'Jira' },
    { value: 'asana', label: 'Asana' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5 text-primary" />
          External Integrations
        </CardTitle>
        <CardDescription>
          Connect with external tools and services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button onClick={syncWithTeams} variant="outline" className="gap-2">
            <Link className="h-4 w-4" />
            Sync Teams
          </Button>
          <Button onClick={syncWithOutlook} variant="outline" className="gap-2">
            <Link className="h-4 w-4" />
            Sync Outlook
          </Button>
        </div>

        <Dialog open={integrationOpen} onOpenChange={setIntegrationOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Link className="h-4 w-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Integration</DialogTitle>
              <DialogDescription>
                Link this meeting with an external service
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Integration Type</Label>
                <Select value={integrationType} onValueChange={setIntegrationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>External ID</Label>
                <Input
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="e.g., document-id, room-id, ticket-id..."
                />
              </div>

              <div>
                <Label>External URL (optional)</Label>
                <Input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <Button 
                onClick={createIntegration} 
                disabled={creating || !integrationType || !externalId}
                className="w-full"
              >
                {creating ? "Creating..." : "Create Integration"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {integrations && integrations.length > 0 ? (
            integrations.map((integration) => (
              <div key={integration.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {integration.integration_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {integration.external_id}
                    </p>
                    {integration.last_synced_at && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(integration.last_synced_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant={integration.sync_status === 'active' ? 'default' : 'destructive'}
                    className="gap-1"
                  >
                    {integration.sync_status === 'active' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {integration.sync_status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {integration.external_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(integration.external_url!, '_blank')}
                      className="gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncIntegration(integration.id)}
                    className="gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sync
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeIntegration(integration.id)}
                    className="gap-1 text-destructive"
                  >
                    <Unlink className="h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Link className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No integrations yet</p>
              <p className="text-xs mt-1">Connect with external tools to enhance collaboration</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};