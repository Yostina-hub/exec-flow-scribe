import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppIntegrationProps {
  meetingId?: string;
  recipientPhone?: string;
}

export const WhatsAppIntegration = ({ meetingId, recipientPhone }: WhatsAppIntegrationProps) => {
  const [phone, setPhone] = useState(recipientPhone || "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendWhatsApp = async () => {
    if (!phone || !message) {
      toast({
        title: "Missing Information",
        description: "Please enter both phone number and message",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-message', {
        body: {
          phone_number: phone,
          message_content: message,
          meeting_id: meetingId,
          channel: 'whatsapp'
        }
      });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: data.is_urgent 
          ? "Urgent message sent via WhatsApp with escalation monitoring"
          : "Message sent via WhatsApp successfully",
      });

      setMessage("");
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast({
        title: "Error",
        description: "Failed to send WhatsApp message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const openWhatsApp = () => {
    if (!phone) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number first",
        variant: "destructive",
      });
      return;
    }

    // Format phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    
    // Open in iframe or new window
    window.open(whatsappUrl, '_blank', 'width=800,height=600');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          WhatsApp Integration
        </CardTitle>
        <CardDescription>
          Send messages directly through WhatsApp with automatic escalation for urgent communications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="+251912345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            Tip: Use keywords like "urgent", "ፍጹም", or "አስቸኳይ" for automatic escalation
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSendWhatsApp}
            disabled={isSending}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send via System"}
          </Button>
          <Button
            onClick={openWhatsApp}
            variant="outline"
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Open WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
