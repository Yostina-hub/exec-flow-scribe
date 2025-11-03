import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ParticipantControlsProps {
  meetingId: string;
  currentUserId: string;
  onMute?: (muted: boolean) => void;
  onVideoDisable?: (disabled: boolean) => void;
  onSuspend?: () => void;
  onKick?: () => void;
}

export function useParticipantControls({
  meetingId,
  currentUserId,
  onMute,
  onVideoDisable,
  onSuspend,
  onKick
}: ParticipantControlsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for mute commands from host
    const muteChannel = supabase
      .channel(`mute-control-${meetingId}`)
      .on('broadcast', { event: 'mute_participant' }, ({ payload }) => {
        if (payload.userId === currentUserId) {
          onMute?.(payload.muted);
          toast({
            title: payload.muted ? "You've been muted" : "You've been unmuted",
            description: payload.muted 
              ? "The host has muted your microphone" 
              : "The host has unmuted your microphone",
          });
        }
      })
      .subscribe();

    // Listen for suspension
    const suspendChannel = supabase
      .channel(`suspend-${meetingId}`)
      .on('broadcast', { event: 'participant_suspended' }, ({ payload }) => {
        if (payload.userId === currentUserId) {
          onSuspend?.();
          toast({
            title: "You've been suspended",
            description: "You have been temporarily suspended by the host",
            variant: "destructive"
          });
        }
      })
      .subscribe();

    // Listen for kick
    const kickChannel = supabase
      .channel(`meeting:${meetingId}`)
      .on('broadcast', { event: 'participant_kicked' }, ({ payload }) => {
        if (payload.userId === currentUserId) {
          onKick?.();
          toast({
            title: "Removed from Meeting",
            description: "You have been removed from this meeting by the host",
            variant: "destructive",
          });
          setTimeout(() => {
            navigate('/meetings');
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(muteChannel);
      supabase.removeChannel(suspendChannel);
      supabase.removeChannel(kickChannel);
    };
  }, [meetingId, currentUserId, navigate, toast, onMute, onVideoDisable, onSuspend, onKick]);
}
