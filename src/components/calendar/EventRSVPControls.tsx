import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, X, HelpCircle } from "lucide-react";

interface EventRSVPControlsProps {
  meetingId: string;
  currentStatus: string;
  onStatusChange?: () => void;
}

export function EventRSVPControls({ meetingId, currentStatus, onStatusChange }: EventRSVPControlsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateRSVP = async (status: 'accepted' | 'declined' | 'tentative') => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('meeting_attendees')
        .update({
          response_status: status,
          responded_at: new Date().toISOString()
        })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "RSVP Updated",
        description: `Your response has been recorded as ${status}.`,
      });

      onStatusChange?.();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant={currentStatus === 'accepted' ? 'default' : 'outline'}
        onClick={() => updateRSVP('accepted')}
        disabled={loading}
        className="h-7 px-2"
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant={currentStatus === 'tentative' ? 'default' : 'outline'}
        onClick={() => updateRSVP('tentative')}
        disabled={loading}
        className="h-7 px-2"
      >
        <HelpCircle className="h-3 w-3" />
      </Button>
      <Button
        size="sm"
        variant={currentStatus === 'declined' ? 'default' : 'outline'}
        onClick={() => updateRSVP('declined')}
        disabled={loading}
        className="h-7 px-2"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
