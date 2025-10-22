import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Mail, MessageCircle, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ShareMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  videoConferenceUrl?: string | null;
}

export function ShareMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  meetingTitle,
  meetingDate,
  meetingTime,
  videoConferenceUrl,
}: ShareMeetingDialogProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const meetingUrl = `${window.location.origin}/meetings/${meetingId}`;
  
  const shareText = `You're invited to: ${meetingTitle}\n\nDate: ${meetingDate}\nTime: ${meetingTime}\n\nMeeting Details: ${meetingUrl}${videoConferenceUrl ? `\n\nJoin Video Call: ${videoConferenceUrl}` : ''}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoConferenceUrl || meetingUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Meeting details copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard. Please try again.');
    }
  };

  const handleShareEmail = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: email,
          subject: `Meeting Invitation: ${meetingTitle}`,
          text: shareText,
          html: `
            <h2>You're invited to: ${meetingTitle}</h2>
            <p><strong>Date:</strong> ${meetingDate}</p>
            <p><strong>Time:</strong> ${meetingTime}</p>
            <p><a href="${meetingUrl}">View Meeting Details</a></p>
            ${videoConferenceUrl ? `<p><a href="${videoConferenceUrl}">Join Video Call</a></p>` : ''}
          `,
        },
      });

      if (error) throw error;

      toast.success('Invitation sent successfully');
      setEmail('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Meeting</DialogTitle>
          <DialogDescription>
            Share this meeting with attendees via different methods
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleShareWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </div>

          {/* Full Details */}
          <div className="space-y-2">
            <Label>Meeting Details</Label>
            <div className="relative">
              <textarea
                className="w-full min-h-[120px] p-3 text-sm border rounded-md resize-none"
                value={shareText}
                readOnly
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyAll}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Email Invitation */}
          <div className="space-y-2">
            <Label htmlFor="email">Send via Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                onClick={handleShareEmail}
                disabled={sending}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
