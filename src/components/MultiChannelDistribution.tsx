import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, MessageSquare, Share2, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface MultiChannelDistributionProps {
  meetingId: string;
}

export const MultiChannelDistribution = ({ meetingId }: MultiChannelDistributionProps) => {
  const [distributionOpen, setDistributionOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [recipients, setRecipients] = useState("");
  const [distributing, setDistributing] = useState(false);
  const { toast } = useToast();

  const { data: channels } = useQuery({
    queryKey: ['distribution-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribution_channels')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: distributions } = useQuery({
    queryKey: ['document-distributions', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_distributions')
        .select('*, distribution_channels(name, channel_type), document_versions(document_type, version_number)')
        .eq('document_versions.meeting_id', meetingId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: latestVersion } = useQuery({
    queryKey: ['latest-version', meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('document_type', 'minutes')
        .eq('is_published', true)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const distributeDocument = async () => {
    if (!latestVersion) {
      toast({
        title: "No published version",
        description: "Please publish a document version first",
        variant: "destructive"
      });
      return;
    }

    setDistributing(true);
    try {
      const recipientList = recipients.split(',').map(r => r.trim()).filter(Boolean);

      for (const channelId of selectedChannels) {
        await supabase.from('document_distributions').insert({
          document_version_id: latestVersion.id,
          channel_id: channelId,
          recipients: recipientList,
          status: 'pending'
        });
      }

      toast({
        title: "Distribution scheduled",
        description: `Document will be sent via ${selectedChannels.length} channel(s)`
      });

      setDistributionOpen(false);
      setSelectedChannels([]);
      setRecipients("");
    } catch (error) {
      console.error('Error distributing:', error);
      toast({
        title: "Distribution failed",
        variant: "destructive"
      });
    } finally {
      setDistributing(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'slack': return MessageSquare;
      case 'teams': return MessageSquare;
      case 'whatsapp': return MessageSquare;
      default: return Share2;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return CheckCircle2;
      case 'failed': return XCircle;
      case 'sending': return Clock;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'failed': return 'destructive';
      case 'sending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          Multi-Channel Distribution
        </CardTitle>
        <CardDescription>
          Distribute documents via email, Slack, Teams, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={distributionOpen} onOpenChange={setDistributionOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Send className="h-4 w-4" />
              Distribute Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Distribute Document</DialogTitle>
              <DialogDescription>
                Send the latest published version to multiple channels
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Channels</Label>
                <div className="space-y-2 mt-2">
                  {channels?.map((channel) => {
                    const Icon = getChannelIcon(channel.channel_type);
                    return (
                      <div key={channel.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedChannels.includes(channel.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedChannels([...selectedChannels, channel.id]);
                            } else {
                              setSelectedChannels(selectedChannels.filter(id => id !== channel.id));
                            }
                          }}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{channel.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {channel.channel_type}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Recipients (comma-separated)</Label>
                <Input
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="user@example.com, @slack-user, ..."
                />
              </div>

              <Button 
                onClick={distributeDocument} 
                disabled={distributing || selectedChannels.length === 0}
                className="w-full"
              >
                {distributing ? "Distributing..." : "Send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Distribution History</h4>
          {distributions && distributions.length > 0 ? (
            distributions.slice(0, 5).map((dist: any) => {
              const StatusIcon = getStatusIcon(dist.status);
              const Icon = getChannelIcon(dist.distribution_channels?.channel_type);
              return (
                <div key={dist.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {dist.distribution_channels?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(dist.recipients) ? dist.recipients.length : 0} recipients • {new Date(dist.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(dist.status)} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {dist.status}
                  </Badge>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Share2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No distributions yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};