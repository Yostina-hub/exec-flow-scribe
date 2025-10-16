import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, MessageSquare, Mail, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface UrgentMessage {
  id: string;
  content: string;
  channel: string;
  escalation_level: number;
  sent_at: string;
  read_at: string | null;
  meeting_id: string | null;
}

export const UrgentMessagesPanel = () => {
  const [messages, setMessages] = useState<UrgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('urgent-messages-panel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_logs',
          filter: 'is_urgent=eq.true',
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_urgent', true)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading urgent messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('message_logs')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Message Marked as Read",
        description: "This message has been marked as read",
      });

      loadMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark message as read",
        variant: "destructive",
      });
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      case 'sms':
        return <Mail className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getEscalationBadge = (level: number) => {
    if (level === 1) return <Badge variant="secondary">WhatsApp</Badge>;
    if (level === 2) return <Badge variant="default">SMS Sent</Badge>;
    if (level === 3) return <Badge variant="destructive">Call Initiated</Badge>;
    return null;
  };

  if (loading) {
    return <div>Loading urgent messages...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Urgent Communications
        </CardTitle>
        <CardDescription>
          Recent urgent messages with escalation status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No urgent messages
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg border ${
                  message.read_at ? 'bg-muted/50' : 'bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(message.channel)}
                    <span className="text-sm font-medium capitalize">
                      {message.channel}
                    </span>
                  </div>
                  {getEscalationBadge(message.escalation_level)}
                </div>
                
                <p className="text-sm mb-2">{message.content}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                  </span>
                  
                  {!message.read_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsRead(message.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark as Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
