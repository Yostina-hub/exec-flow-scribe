import { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Environment, PerspectiveCamera } from '@react-three/drei';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Clock, Users } from 'lucide-react';
import * as THREE from 'three';

interface VirtualMeetingRoomProps {
  meetingId: string;
  isHost: boolean;
  currentUserId: string;
}

// 3D Meeting Room Environment
function MeetingRoomScene({ agenda, currentSlide }: { agenda: any[], currentSlide: number }) {
  const boardRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (boardRef.current) {
      boardRef.current.position.y = Math.sin(time * 0.5) * 0.05 + 2;
    }
  });

  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 2, 8]} />
      <OrbitControls 
        enableZoom={true}
        minDistance={5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2}
      />
      
      {/* Room Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Conference Table */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[8, 0.2, 3]} />
        <meshStandardMaterial color="#2d2d44" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Large Digital Screen */}
      <group position={[0, 3, -5]}>
        <mesh ref={boardRef}>
          <boxGeometry args={[10, 5, 0.2]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        
        {/* Screen Content */}
        <mesh position={[0, 0, 0.11]}>
          <planeGeometry args={[9.5, 4.5]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
        
        {/* Current Slide Title */}
        {agenda[currentSlide] && (
          <Text
            position={[0, 0, 0.15]}
            fontSize={0.4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            maxWidth={8}
          >
            {agenda[currentSlide].title}
          </Text>
        )}
      </group>

      {/* Participant Seats (Visual Indicators) */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 4;
        return (
          <Sphere 
            key={i}
            position={[
              Math.cos(angle) * radius,
              1.2,
              Math.sin(angle) * radius
            ]}
            args={[0.3, 16, 16]}
          >
            <meshStandardMaterial 
              color="#3b82f6" 
              emissive="#3b82f6"
              emissiveIntensity={0.5}
            />
          </Sphere>
        );
      })}

      {/* Ambient Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.5} />
    </>
  );
}

export function VirtualMeetingRoom({ meetingId, isHost, currentUserId }: VirtualMeetingRoomProps) {
  const { toast } = useToast();
  const [meeting, setMeeting] = useState<any>(null);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [transcription, setTranscription] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    fetchMeetingData();
    setupRealtimeSubscriptions();
  }, [meetingId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchMeetingData = async () => {
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();
    
    setMeeting(meetingData);
    setIsRecording(meetingData?.status === 'in_progress');

    const { data: agendaData } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('sequence_number');
    
    setAgenda(agendaData || []);

    const { data: participantsData } = await supabase
      .from('meeting_attendees')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('meeting_id', meetingId);
    
    setParticipants(participantsData || []);
  };

  const setupRealtimeSubscriptions = () => {
    // Participants updates
    const participantsChannel = supabase
      .channel(`virtual-room-${meetingId}-participants`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_attendees',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        fetchMeetingData();
      })
      .subscribe();

    // Transcription updates
    const transcriptionChannel = supabase
      .channel(`virtual-room-${meetingId}-transcription`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcription_segments',
        filter: `meeting_id=eq.${meetingId}`,
      }, (payload) => {
        setTranscription(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(transcriptionChannel);
    };
  };

  const toggleHandRaise = async () => {
    const newValue = !handRaised;
    setHandRaised(newValue);
    
    await supabase
      .from('meeting_attendees')
      .update({ 
        speaking_requested_at: newValue ? new Date().toISOString() : null 
      })
      .eq('meeting_id', meetingId)
      .eq('user_id', currentUserId);

    toast({
      title: newValue ? "Hand Raised" : "Hand Lowered",
      description: newValue ? "The host has been notified" : "Request withdrawn",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{meeting?.title}</h1>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white mr-2" />
              REC {formatTime(recordingTime)}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
          
          <Button
            variant={handRaised ? "default" : "outline"}
            size="icon"
            onClick={toggleHandRaise}
          >
            <Hand className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Virtual Room */}
        <div className="flex-1 relative">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading Virtual Room...</p>
              </div>
            </div>
          }>
            <Canvas shadows>
              <MeetingRoomScene agenda={agenda} currentSlide={currentSlide} />
            </Canvas>
          </Suspense>

          {/* Slide Controls */}
          {agenda.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
              >
                Previous
              </Button>
              <Badge variant="outline" className="px-4 py-2">
                {currentSlide + 1} / {agenda.length}
              </Badge>
              <Button
                variant="secondary"
                onClick={() => setCurrentSlide(Math.min(agenda.length - 1, currentSlide + 1))}
                disabled={currentSlide === agenda.length - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Meeting Tools */}
        <Card className="w-96 border-l rounded-none">
          <Tabs defaultValue="participants" className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="participants">
                <Users className="h-4 w-4 mr-2" />
                Participants
              </TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
              <TabsTrigger value="transcription">
                <MessageSquare className="h-4 w-4 mr-2" />
                Live
              </TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {p.profiles?.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{p.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{p.role}</p>
                      </div>
                      {p.is_speaking && (
                        <Badge variant="default">Speaking</Badge>
                      )}
                      {p.speaking_requested_at && (
                        <Hand className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="agenda" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-2">
                  {agenda.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border-l-4 cursor-pointer ${
                        idx === currentSlide
                          ? 'border-primary bg-primary/10'
                          : 'border-muted bg-muted'
                      }`}
                      onClick={() => setCurrentSlide(idx)}
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.duration_minutes} min
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transcription" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {transcription.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-lg bg-muted">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {new Date(t.created_at).toLocaleTimeString()}
                      </p>
                      <p className="text-sm">{t.text}</p>
                    </div>
                  ))}
                  {transcription.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      No transcription yet. Start speaking to see live transcription.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
