import { useState, useEffect } from 'react';
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
import { Copy, Mail, MessageCircle, Check, X, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface ShareMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  videoConferenceUrl?: string | null;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
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
  const [emailSent, setEmailSent] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');
      if (data) setUsers(data);
    };
    if (open) {
      fetchUsers();
      setEmailSent(false); // Reset when dialog opens
    }
  }, [open]);

  const meetingUrl = `${window.location.origin}/meetings/${meetingId}`;
  
  const shareText = `You're invited to: ${meetingTitle}\n\nDate: ${meetingDate}\nTime: ${meetingTime}\n\nMeeting Details: ${meetingUrl}${videoConferenceUrl ? `\n\nJoin Video Call: ${videoConferenceUrl}` : ''}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoConferenceUrl || meetingUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Failed to copy link. Please check clipboard permissions.');
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Meeting details copied to clipboard');
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Failed to copy details. Please check clipboard permissions.');
    }
  };

  const handleAddCustomEmail = () => {
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (customEmails.includes(email)) {
      toast.error('Email already added');
      return;
    }
    setCustomEmails([...customEmails, email]);
    setEmail('');
  };

  const handleRemoveCustomEmail = (emailToRemove: string) => {
    setCustomEmails(customEmails.filter(e => e !== emailToRemove));
  };

  const handleSelectUser = (user: User) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleRemoveSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleShareEmail = async () => {
    const allEmails = [
      ...selectedUsers.map(u => u.email),
      ...customEmails
    ];

    if (allEmails.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSending(true);
    try {
      const results = await Promise.allSettled(
        allEmails.map(email =>
          supabase.functions.invoke('send-notification-email', {
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
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Invitations sent to ${successful} recipient${successful > 1 ? 's' : ''}`);
        setEmailSent(true); // Mark email as sent
      }
      if (failed > 0) {
        toast.error(`Failed to send to ${failed} recipient${failed > 1 ? 's' : ''}`);
      }

      setSelectedUsers([]);
      setCustomEmails([]);
    } catch (error: any) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send invitations');
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
          <div className="space-y-3">
            <Label>Send via Email</Label>
            
            {/* Select Registered Users */}
            <div className="space-y-2">
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <UserPlus className="h-4 w-4" />
                    Select from users
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-background z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => {
                              handleSelectUser(user);
                              setPopoverOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                className={`h-4 w-4 ${
                                  selectedUsers.find(u => u.id === user.id)
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                }`}
                              />
                              <div>
                                <div className="font-medium">{user.full_name || 'No name'}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Add Unregistered User */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="unregistered@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomEmail();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={handleAddCustomEmail}
                disabled={!email}
              >
                Add
              </Button>
            </div>

            {/* Selected Recipients */}
            {(selectedUsers.length > 0 || customEmails.length > 0) && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Recipients:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge key={user.id} variant="secondary" className="gap-1">
                      {user.full_name || user.email}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveSelectedUser(user.id)}
                      />
                    </Badge>
                  ))}
                  {customEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveCustomEmail(email)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleShareEmail}
              disabled={sending || (selectedUsers.length === 0 && customEmails.length === 0)}
              className="w-full gap-2"
            >
              <Mail className="h-4 w-4" />
              {sending ? 'Sending...' : `Send to ${selectedUsers.length + customEmails.length} recipient${selectedUsers.length + customEmails.length !== 1 ? 's' : ''}`}
            </Button>
          </div>

          {/* Close Button - Shows after successful send */}
          {emailSent && (
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
