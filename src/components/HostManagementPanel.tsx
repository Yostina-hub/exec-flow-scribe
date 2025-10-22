import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  Mic, 
  MicOff, 
  UserPlus, 
  CheckCircle,
  XCircle,
  Hand,
  Eye,
  Settings,
  Sparkles,
  Star,
  Crown,
  Lightbulb,
  Music,
  Volume2
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaResourceManager } from './MediaResourceManager';

interface HostManagementPanelProps {
  meetingId: string;
  onLaunchRoom: () => void;
}

interface EventSettings {
  mode: 'standard' | 'vip' | 'conference' | 'press-briefing' | 'ceremony';
  lighting: 'ambient' | 'spotlight' | 'dramatic' | 'festive';
  backgroundTheme: 'corporate' | 'elegant' | 'futuristic' | 'minimal';
  vipParticipants: string[];
  intermission?: boolean;
  ambientVolume?: number;
}

export function HostManagementPanel({ meetingId, onLaunchRoom }: HostManagementPanelProps) {
  const { toast } = useToast();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(meetingId);
  const [meeting, setMeeting] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [newAgendaItem, setNewAgendaItem] = useState({ title: '', duration: 15 });
  const [inviteEmail, setInviteEmail] = useState('');
  const [eventSettings, setEventSettings] = useState<EventSettings>({
    mode: 'standard',
    lighting: 'ambient',
    backgroundTheme: 'futuristic',
    vipParticipants: [],
    intermission: false,
    ambientVolume: 0.3,
  });

  useEffect(() => {
    fetchAllData();
    setupRealtimeSubscriptions();
  }, [meetingId]);

  const fetchAllData = async () => {
    // Fetch meeting
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();
    setMeeting(meetingData);

    // Fetch participants
    const { data: participantsData } = await supabase
      .from('meeting_attendees')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('meeting_id', meetingId);
    setParticipants(participantsData || []);

    // Fetch agenda
    const { data: agendaData } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('order_index');
    setAgenda(agendaData || []);
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel(`host-panel-${meetingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_attendees',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleStartMeeting = async () => {
    try {
      await startRecording();
      
      await supabase
        .from('meetings')
        .update({ 
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', meetingId);

      toast({
        title: "Meeting Started",
        description: "Recording and transcription are active",
      });

      // Auto-launch virtual room
      setTimeout(() => {
        onLaunchRoom();
      }, 1000);
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast({
        title: "Error",
        description: "Failed to start meeting",
        variant: "destructive",
      });
    }
  };

  const handlePauseMeeting = async () => {
    await supabase
      .from('meetings')
      .update({ status: 'scheduled' })
      .eq('id', meetingId);

    toast({
      title: "Meeting Paused",
    });
  };

  const handleEndMeeting = async () => {
    try {
      await stopRecording();

      await supabase
        .from('meetings')
        .update({ 
          status: 'completed',
          actual_end_time: new Date().toISOString()
        })
        .eq('id', meetingId);

      toast({
        title: "Meeting Ended",
        description: "Minutes will be generated automatically",
      });
    } catch (error) {
      console.error('Error ending meeting:', error);
    }
  };

  const handleToggleMic = async (attendeeId: string, currentState: boolean) => {
    await supabase
      .from('meeting_attendees')
      .update({ can_speak: !currentState })
      .eq('id', attendeeId);

    toast({
      title: !currentState ? "Microphone Granted" : "Microphone Revoked",
    });
  };

  const handleHandRaiseResponse = async (attendeeId: string, grant: boolean) => {
    await supabase
      .from('meeting_attendees')
      .update({ 
        can_speak: grant,
        speaking_requested_at: null
      })
      .eq('id', attendeeId);

    toast({
      title: grant ? "Speaker Access Granted" : "Request Denied",
    });
  };

  const handleAddAgendaItem = async () => {
    if (!newAgendaItem.title) return;

    const maxSeq = Math.max(...agenda.map(a => a.order_index || 0), 0);

    await supabase
      .from('agenda_items')
      .insert({
        meeting_id: meetingId,
        title: newAgendaItem.title,
        duration_minutes: newAgendaItem.duration,
        order_index: maxSeq + 1,
      });

    setNewAgendaItem({ title: '', duration: 15 });
    fetchAllData();

    toast({
      title: "Agenda Item Added",
    });
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) return;

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail)
      .single();

    if (!profile) {
      toast({
        title: "User Not Found",
        description: "No user with this email exists",
        variant: "destructive",
      });
      return;
    }

    // Add as attendee
    await supabase
      .from('meeting_attendees')
      .insert({
        meeting_id: meetingId,
        user_id: profile.id,
        role: 'participant',
        response_status: 'pending',
      });

    setInviteEmail('');
    fetchAllData();

    toast({
      title: "Invitation Sent",
    });
  };

  const broadcastEventSettings = async (settings: EventSettings) => {
    const channel = supabase.channel(`event-settings-${meetingId}`);
    await channel.send({
      type: 'broadcast',
      event: 'settings-update',
      payload: settings
    });
    
    toast({
      title: "Event Settings Updated",
      description: "All participants will see the new settings",
    });
  };

  const handleToggleVIP = async (userId: string) => {
    const newVips = eventSettings.vipParticipants.includes(userId)
      ? eventSettings.vipParticipants.filter(id => id !== userId)
      : [...eventSettings.vipParticipants, userId];

    const newSettings = {
      ...eventSettings,
      vipParticipants: newVips
    };
    
    setEventSettings(newSettings);
    await broadcastEventSettings(newSettings);
  };

  const handleEventModeChange = async (mode: EventSettings['mode']) => {
    const newSettings = { ...eventSettings, mode };
    setEventSettings(newSettings);
    await broadcastEventSettings(newSettings);
  };

  const handleLightingChange = async (lighting: EventSettings['lighting']) => {
    const newSettings = { ...eventSettings, lighting };
    setEventSettings(newSettings);
    await broadcastEventSettings(newSettings);
  };

  const handleIntermissionToggle = async () => {
    const newSettings = { ...eventSettings, intermission: !eventSettings.intermission };
    setEventSettings(newSettings);
    await broadcastEventSettings(newSettings);
    toast({
      title: newSettings.intermission ? "Intermission Started" : "Intermission Ended",
      description: newSettings.intermission ? "Ambient music is playing" : "Meeting resumed",
    });
  };

  const handleVolumeChange = async (volume: number) => {
    const newSettings = { ...eventSettings, ambientVolume: volume };
    setEventSettings(newSettings);
    await broadcastEventSettings(newSettings);
  };

  const promoteToSpeaker = async (userId: string) => {
    await supabase
      .from('meeting_attendees')
      .update({ can_speak: true })
      .eq('meeting_id', meetingId)
      .eq('user_id', userId);
    fetchAllData();
    toast({
      title: "Promoted to Speaker",
      description: "Participant can now speak",
    });
  };

  return (
    <div className="h-screen w-full bg-background p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{meeting?.title}</h1>
            <p className="text-muted-foreground">Host Management Panel</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onLaunchRoom} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View Room
            </Button>
          </div>
        </div>

        {/* Meeting Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            {meeting?.status !== 'in_progress' ? (
              <Button onClick={handleStartMeeting} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Meeting
              </Button>
            ) : (
              <>
                <Button onClick={handlePauseMeeting} variant="secondary" className="flex-1">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={handleEndMeeting} variant="destructive" className="flex-1">
                  <Square className="h-4 w-4 mr-2" />
                  End Meeting
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Main Management Tabs */}
        <Tabs defaultValue="participants" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="event">
              <Sparkles className="h-4 w-4 mr-2" />
              Event Mode
            </TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="invites">Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Manage Participants</CardTitle>
                <CardDescription>Control who can speak and designate VIPs</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                          eventSettings.vipParticipants.includes(p.user_id)
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                            : 'bg-primary text-primary-foreground'
                        }`}>
                          {eventSettings.vipParticipants.includes(p.user_id) && (
                            <Crown className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400" />
                          )}
                          {p.profiles?.full_name?.[0] || '?'}
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            {p.profiles?.full_name}
                            {eventSettings.vipParticipants.includes(p.user_id) && (
                              <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500">
                                <Star className="h-3 w-3 mr-1" />
                                VIP
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{p.profiles?.email}</p>
                          <Badge variant="outline" className="mt-1">{p.role}</Badge>
                        </div>

                        <Button
                          size="sm"
                          variant={eventSettings.vipParticipants.includes(p.user_id) ? "default" : "outline"}
                          onClick={() => handleToggleVIP(p.user_id)}
                          className={eventSettings.vipParticipants.includes(p.user_id) ? 
                            'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : ''
                          }
                        >
                          <Star className="h-4 w-4 mr-1" />
                          {eventSettings.vipParticipants.includes(p.user_id) ? 'VIP' : 'Make VIP'}
                        </Button>

                        {!p.can_speak && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => promoteToSpeaker(p.user_id)}
                          >
                            <Mic className="h-4 w-4 mr-1" />
                            Promote
                          </Button>
                        )}

                        {p.speaking_requested_at && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleHandRaiseResponse(p.id, true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Allow
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleHandRaiseResponse(p.id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Deny
                            </Button>
                          </div>
                        )}

                        <Button
                          size="icon"
                          variant={p.can_speak ? "default" : "outline"}
                          onClick={() => handleToggleMic(p.id, p.can_speak)}
                        >
                          {p.can_speak ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </Button>

                        {p.speaking_requested_at && (
                          <Hand className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="event">
            <Card>
              <CardHeader>
                <CardTitle>Event Settings</CardTitle>
                <CardDescription>Configure the virtual room experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Mode */}
                <div className="space-y-3">
                  <Label>Event Mode</Label>
                  <Select value={eventSettings.mode} onValueChange={(v) => handleEventModeChange(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Meeting</SelectItem>
                      <SelectItem value="vip">VIP Event</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="press-briefing">Press Briefing</SelectItem>
                      <SelectItem value="ceremony">Ceremony</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {eventSettings.mode === 'vip' && 'Highlights VIP guests on the main stage'}
                    {eventSettings.mode === 'conference' && 'Optimized for panel discussions'}
                    {eventSettings.mode === 'press-briefing' && 'Professional briefing layout'}
                    {eventSettings.mode === 'ceremony' && 'Festive atmosphere for special occasions'}
                    {eventSettings.mode === 'standard' && 'Regular meeting layout'}
                  </p>
                </div>

                {/* Lighting */}
                <div className="space-y-3">
                  <Label>Lighting Effects</Label>
                  <Select value={eventSettings.lighting} onValueChange={(v) => handleLightingChange(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambient">Ambient</SelectItem>
                      <SelectItem value="spotlight">Spotlight</SelectItem>
                      <SelectItem value="dramatic">Dramatic</SelectItem>
                      <SelectItem value="festive">Festive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {eventSettings.lighting === 'spotlight' && 'Focuses attention on active speaker'}
                    {eventSettings.lighting === 'dramatic' && 'Multiple colored lights for impact'}
                    {eventSettings.lighting === 'festive' && 'Colorful party atmosphere'}
                    {eventSettings.lighting === 'ambient' && 'Soft, professional lighting'}
                  </p>
                </div>

                {/* Intermission Control */}
                <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-purple-500" />
                      <Label>Intermission Mode</Label>
                    </div>
                    <Button
                      size="sm"
                      variant={eventSettings.intermission ? "default" : "outline"}
                      onClick={handleIntermissionToggle}
                      className={eventSettings.intermission ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}
                    >
                      {eventSettings.intermission ? 'End Break' : 'Start Break'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Play ambient music during breaks or before meeting starts
                  </p>
                  
                  {eventSettings.intermission && (
                    <div className="space-y-2 mt-4">
                      <Label>Ambient Volume: {Math.round((eventSettings.ambientVolume || 0.3) * 100)}%</Label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={eventSettings.ambientVolume || 0.3}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* VIP Summary */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <Label>VIP Participants ({eventSettings.vipParticipants.length})</Label>
                  </div>
                  {eventSettings.vipParticipants.length > 0 ? (
                    <div className="space-y-2">
                      {eventSettings.vipParticipants.map(vipId => {
                        const vip = participants.find(p => p.user_id === vipId);
                        return vip ? (
                          <div key={vipId} className="flex items-center gap-2 p-2 bg-background rounded">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">{vip.profiles?.full_name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No VIP participants yet</p>
                  )}
                </div>

                {/* Apply Button */}
                <Button 
                  onClick={() => broadcastEventSettings(eventSettings)}
                  className="w-full"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Apply Settings to Room
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agenda">
            <Card>
              <CardHeader>
                <CardTitle>Manage Agenda</CardTitle>
                <CardDescription>Add and organize agenda items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Agenda item title"
                    value={newAgendaItem.title}
                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, title: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Duration (min)"
                    className="w-32"
                    value={newAgendaItem.duration}
                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, duration: parseInt(e.target.value) || 15 })}
                  />
                  <Button onClick={handleAddAgendaItem}>Add</Button>
                </div>

                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {agenda.map((item, idx) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge>{idx + 1}</Badge>
                          <p className="font-medium flex-1">{item.title}</p>
                          <Badge variant="outline">{item.duration_minutes} min</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <MediaResourceManager meetingId={meetingId} />
          </TabsContent>

          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <CardTitle>Send Invitations</CardTitle>
                <CardDescription>Invite participants to the meeting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="participant@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button onClick={handleSendInvite}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
