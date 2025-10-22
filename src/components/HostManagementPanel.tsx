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
  Settings
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HostManagementPanelProps {
  meetingId: string;
  onLaunchRoom: () => void;
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
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="invites">Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <Card>
              <CardHeader>
                <CardTitle>Manage Participants</CardTitle>
                <CardDescription>Control who can speak and interact</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {p.profiles?.full_name?.[0] || '?'}
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium">{p.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{p.profiles?.email}</p>
                          <Badge variant="outline" className="mt-1">{p.role}</Badge>
                        </div>

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
