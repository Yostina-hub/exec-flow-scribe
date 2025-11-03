import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Mic, MicOff, Video, VideoOff, Hand, UserX, Crown, 
  Ban, Shield, Volume2, VolumeX, Sparkles, Eye, EyeOff,
  Radio, Clock, MessageSquare, MoreVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Participant {
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  role?: string;
  attended?: boolean;
  speaking_requested_at?: string;
}

interface ParticipantState {
  userId: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSuspended: boolean;
  isSpotlighted: boolean;
  isPresenter: boolean;
  handRaised: boolean;
  handRaisedAt?: string;
  speakingTime: number;
}

interface AdvancedHostControlsProps {
  meetingId: string;
  isHost: boolean;
  participants: Participant[];
  currentUserId: string;
  onlineUsers: string[];
}

export function AdvancedHostControls({
  meetingId,
  isHost,
  participants,
  currentUserId,
  onlineUsers
}: AdvancedHostControlsProps) {
  const [participantStates, setParticipantStates] = useState<Record<string, ParticipantState>>({});
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{ type: string; userId: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isHost) return;

    // Initialize participant states
    const initialStates: Record<string, ParticipantState> = {};
    participants.forEach(p => {
      initialStates[p.user_id] = {
        userId: p.user_id,
        isMuted: false,
        isVideoOff: false,
        isSuspended: false,
        isSpotlighted: false,
        isPresenter: false,
        handRaised: !!p.speaking_requested_at,
        handRaisedAt: p.speaking_requested_at,
        speakingTime: 0
      };
    });
    setParticipantStates(initialStates);

    // Subscribe to participant state changes
    const stateChannel = supabase
      .channel(`participant-states-${meetingId}`)
      .on('broadcast', { event: 'participant_state_changed' }, ({ payload }) => {
        setParticipantStates(prev => ({
          ...prev,
          [payload.userId]: {
            ...prev[payload.userId],
            ...payload.state
          }
        }));
      })
      .subscribe();

    // Subscribe to hand raise events
    const handRaiseChannel = supabase
      .channel(`hand-raises-${meetingId}`)
      .on('broadcast', { event: 'hand-raised' }, ({ payload }) => {
        setParticipantStates(prev => ({
          ...prev,
          [payload.user_id]: {
            ...prev[payload.user_id],
            handRaised: true,
            handRaisedAt: payload.timestamp
          }
        }));
      })
      .on('broadcast', { event: 'hand-lowered' }, ({ payload }) => {
        setParticipantStates(prev => ({
          ...prev,
          [payload.user_id]: {
            ...prev[payload.user_id],
            handRaised: false,
            handRaisedAt: undefined
          }
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stateChannel);
      supabase.removeChannel(handRaiseChannel);
    };
  }, [meetingId, isHost, participants]);

  const broadcastParticipantState = async (userId: string, state: Partial<ParticipantState>) => {
    const channel = supabase.channel(`participant-states-${meetingId}`);
    await channel.send({
      type: 'broadcast',
      event: 'participant_state_changed',
      payload: { userId, state }
    });
  };

  const toggleMute = async (userId: string) => {
    const currentState = participantStates[userId];
    const newMuteState = !currentState?.isMuted;
    
    setParticipantStates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], isMuted: newMuteState }
    }));

    await broadcastParticipantState(userId, { isMuted: newMuteState });

    // Broadcast mute command
    const muteChannel = supabase.channel(`mute-control-${meetingId}`);
    await muteChannel.send({
      type: 'broadcast',
      event: 'mute_participant',
      payload: { userId, muted: newMuteState }
    });

    toast({
      title: newMuteState ? "Participant Muted" : "Participant Unmuted",
      description: `${getParticipantName(userId)} has been ${newMuteState ? 'muted' : 'unmuted'}`,
    });
  };

  const toggleVideo = async (userId: string) => {
    const currentState = participantStates[userId];
    const newVideoState = !currentState?.isVideoOff;
    
    setParticipantStates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], isVideoOff: newVideoState }
    }));

    await broadcastParticipantState(userId, { isVideoOff: newVideoState });

    toast({
      title: newVideoState ? "Video Disabled" : "Video Enabled",
      description: `${getParticipantName(userId)}'s video has been ${newVideoState ? 'disabled' : 'enabled'}`,
    });
  };

  const suspendParticipant = async (userId: string) => {
    setParticipantStates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], isSuspended: true }
    }));

    await broadcastParticipantState(userId, { isSuspended: true });

    // Broadcast suspension
    const suspendChannel = supabase.channel(`suspend-${meetingId}`);
    await suspendChannel.send({
      type: 'broadcast',
      event: 'participant_suspended',
      payload: { userId }
    });

    toast({
      title: "Participant Suspended",
      description: `${getParticipantName(userId)} has been temporarily suspended`,
      variant: "destructive"
    });

    setActionDialog(null);
  };

  const removeParticipant = async (userId: string) => {
    // Remove from attendees
    await supabase
      .from('meeting_attendees')
      .delete()
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);

    // Broadcast removal
    const kickChannel = supabase.channel(`meeting:${meetingId}`);
    await kickChannel.send({
      type: 'broadcast',
      event: 'participant_kicked',
      payload: { userId }
    });

    toast({
      title: "Participant Removed",
      description: `${getParticipantName(userId)} has been removed from the meeting`,
      variant: "destructive"
    });

    setActionDialog(null);
  };

  const toggleSpotlight = async (userId: string) => {
    const currentState = participantStates[userId];
    const newSpotlightState = !currentState?.isSpotlighted;
    
    // Remove spotlight from all others if enabling
    if (newSpotlightState) {
      const updates: Record<string, ParticipantState> = {};
      Object.keys(participantStates).forEach(id => {
        updates[id] = { ...participantStates[id], isSpotlighted: false };
      });
      updates[userId] = { ...participantStates[userId], isSpotlighted: true };
      setParticipantStates(updates);
    } else {
      setParticipantStates(prev => ({
        ...prev,
        [userId]: { ...prev[userId], isSpotlighted: false }
      }));
    }

    await broadcastParticipantState(userId, { isSpotlighted: newSpotlightState });

    toast({
      title: newSpotlightState ? "Spotlight Enabled" : "Spotlight Disabled",
      description: newSpotlightState 
        ? `${getParticipantName(userId)} is now in spotlight`
        : "Spotlight removed",
    });
  };

  const togglePresenter = async (userId: string) => {
    const currentState = participantStates[userId];
    const newPresenterState = !currentState?.isPresenter;
    
    setParticipantStates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], isPresenter: newPresenterState }
    }));

    await broadcastParticipantState(userId, { isPresenter: newPresenterState });

    toast({
      title: newPresenterState ? "Presenter Rights Granted" : "Presenter Rights Removed",
      description: `${getParticipantName(userId)} ${newPresenterState ? 'can now present' : 'is no longer a presenter'}`,
    });
  };

  const lowerHand = async (userId: string) => {
    setParticipantStates(prev => ({
      ...prev,
      [userId]: { ...prev[userId], handRaised: false, handRaisedAt: undefined }
    }));

    await supabase
      .from('meeting_attendees')
      .update({ speaking_requested_at: null })
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);

    const channel = supabase.channel(`hand-raises-${meetingId}`);
    await channel.send({
      type: 'broadcast',
      event: 'hand-lowered',
      payload: { user_id: userId }
    });

    toast({
      title: "Hand Lowered",
      description: `${getParticipantName(userId)}'s hand has been lowered`,
    });
  };

  const getParticipantName = (userId: string) => {
    const participant = participants.find(p => p.user_id === userId);
    return participant?.profiles?.full_name || 'Unknown';
  };

  const getParticipantInitials = (userId: string) => {
    const name = getParticipantName(userId);
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    const aState = participantStates[a.user_id];
    const bState = participantStates[b.user_id];
    
    // Host first
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    
    // Hand raised next (sorted by time)
    if (aState?.handRaised && !bState?.handRaised) return -1;
    if (!aState?.handRaised && bState?.handRaised) return 1;
    if (aState?.handRaised && bState?.handRaised) {
      return (aState.handRaisedAt || '') > (bState.handRaisedAt || '') ? 1 : -1;
    }
    
    // Online next
    const aOnline = onlineUsers.includes(a.user_id);
    const bOnline = onlineUsers.includes(b.user_id);
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    
    // Alphabetical
    return getParticipantName(a.user_id).localeCompare(getParticipantName(b.user_id));
  });

  if (!isHost) return null;

  return (
    <>
      <Card className="border-0 bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Host Controls</CardTitle>
            <Badge variant="outline" className="ml-auto">
              {sortedParticipants.length} participants
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {sortedParticipants.map(participant => {
                const state = participantStates[participant.user_id];
                const isOnline = onlineUsers.includes(participant.user_id);
                const isCurrentUser = participant.user_id === currentUserId;

                return (
                  <Card 
                    key={participant.user_id}
                    className={cn(
                      "border transition-all duration-300",
                      state?.isSpotlighted && "border-yellow-500 shadow-lg shadow-yellow-500/20",
                      state?.isSuspended && "opacity-50 border-red-500",
                      !isOnline && "opacity-60"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={cn(
                              "text-xs font-bold",
                              isOnline ? "bg-gradient-to-br from-green-500 to-emerald-500" : "bg-muted"
                            )}>
                              {getParticipantInitials(participant.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {getParticipantName(participant.user_id)}
                            </span>
                            {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
                            {state?.isPresenter && (
                              <Badge className="text-xs gap-1 bg-purple-500">
                                <Crown className="h-3 w-3" />
                                Presenter
                              </Badge>
                            )}
                            {state?.isSpotlighted && (
                              <Badge className="text-xs gap-1 bg-yellow-500">
                                <Sparkles className="h-3 w-3" />
                                Spotlight
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            {state?.isMuted && (
                              <Badge variant="outline" className="text-xs gap-1 text-red-500">
                                <MicOff className="h-2.5 w-2.5" />
                                Muted
                              </Badge>
                            )}
                            {state?.isVideoOff && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <VideoOff className="h-2.5 w-2.5" />
                                No Video
                              </Badge>
                            )}
                            {state?.handRaised && (
                              <Badge className="text-xs gap-1 bg-orange-500 animate-pulse">
                                <Hand className="h-2.5 w-2.5" />
                                Hand Raised
                              </Badge>
                            )}
                            {state?.isSuspended && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <Ban className="h-2.5 w-2.5" />
                                Suspended
                              </Badge>
                            )}
                          </div>
                        </div>

                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Participant Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem onClick={() => toggleMute(participant.user_id)}>
                                {state?.isMuted ? (
                                  <><Mic className="mr-2 h-4 w-4" /> Unmute</>
                                ) : (
                                  <><MicOff className="mr-2 h-4 w-4" /> Mute</>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => toggleVideo(participant.user_id)}>
                                {state?.isVideoOff ? (
                                  <><Video className="mr-2 h-4 w-4" /> Enable Video</>
                                ) : (
                                  <><VideoOff className="mr-2 h-4 w-4" /> Disable Video</>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => toggleSpotlight(participant.user_id)}>
                                {state?.isSpotlighted ? (
                                  <><EyeOff className="mr-2 h-4 w-4" /> Remove Spotlight</>
                                ) : (
                                  <><Eye className="mr-2 h-4 w-4" /> Spotlight</>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => togglePresenter(participant.user_id)}>
                                {state?.isPresenter ? (
                                  <><Crown className="mr-2 h-4 w-4" /> Remove Presenter</>
                                ) : (
                                  <><Crown className="mr-2 h-4 w-4" /> Make Presenter</>
                                )}
                              </DropdownMenuItem>
                              
                              {state?.handRaised && (
                                <DropdownMenuItem onClick={() => lowerHand(participant.user_id)}>
                                  <Hand className="mr-2 h-4 w-4" /> Lower Hand
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                onClick={() => setActionDialog({ type: 'suspend', userId: participant.user_id })}
                                className="text-orange-500"
                              >
                                <Ban className="mr-2 h-4 w-4" /> Suspend
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => setActionDialog({ type: 'remove', userId: participant.user_id })}
                                className="text-red-500"
                              >
                                <UserX className="mr-2 h-4 w-4" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.type === 'suspend' ? 'Suspend Participant?' : 'Remove Participant?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.type === 'suspend' 
                ? `${getParticipantName(actionDialog.userId)} will be temporarily suspended and muted.`
                : `${getParticipantName(actionDialog.userId)} will be permanently removed from this meeting.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionDialog?.type === 'suspend') {
                  suspendParticipant(actionDialog.userId);
                } else if (actionDialog?.type === 'remove') {
                  removeParticipant(actionDialog.userId);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {actionDialog?.type === 'suspend' ? 'Suspend' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
