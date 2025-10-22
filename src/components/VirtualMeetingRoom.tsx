import { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Environment, PerspectiveCamera, Html, useTexture } from '@react-three/drei';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Clock, Users, Sparkles, Activity, Zap } from 'lucide-react';
import * as THREE from 'three';

interface VirtualMeetingRoomProps {
  meetingId: string;
  isHost: boolean;
  currentUserId: string;
}

// Particle System for Ambient Effects
function ParticleField() {
  const points = useRef<THREE.Points>(null);
  const particleCount = 500;

  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = Math.random() * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#3b82f6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Holographic Data Display
function HolographicDataDisplay({ position, data }: { position: [number, number, number], data: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial
        color="#00ffff"
        emissive="#00ffff"
        emissiveIntensity={0.8}
        transparent
        opacity={0.7}
        wireframe
      />
    </mesh>
  );
}

// Animated Media Screen
function MediaScreen({ resource, position }: { resource: any, position: [number, number, number] }) {
  const screenRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (screenRef.current) {
      screenRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.08;
    }
    if (glowRef.current) {
      glowRef.current.scale.x = 1 + Math.sin(time * 2) * 0.05;
      glowRef.current.scale.y = 1 + Math.sin(time * 2) * 0.05;
    }
  });

  return (
    <group position={position}>
      {/* Screen Frame with Glow */}
      <mesh ref={screenRef}>
        <boxGeometry args={[12, 6, 0.3]} />
        <meshStandardMaterial
          color="#0a0a1e"
          metalness={0.9}
          roughness={0.1}
          emissive="#1e40af"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Glow Effect */}
      <mesh ref={glowRef} position={[0, 0, 0.2]}>
        <planeGeometry args={[12.5, 6.5]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Content Display */}
      <mesh position={[0, 0, 0.16]}>
        <planeGeometry args={[11.5, 5.5]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      {/* Resource Info */}
      {resource && (
        <>
          <Text
            position={[0, 1.5, 0.17]}
            fontSize={0.5}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            maxWidth={10}
            fontWeight={700}
          >
            {resource.title}
          </Text>
          
          <Text
            position={[0, 0.5, 0.17]}
            fontSize={0.3}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
            maxWidth={10}
          >
            {resource.description || 'Now Presenting'}
          </Text>

          {/* Type Badge */}
          <mesh position={[0, -1, 0.17]}>
            <planeGeometry args={[2, 0.6]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          <Text
            position={[0, -1, 0.18]}
            fontSize={0.25}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {resource.type.toUpperCase()}
          </Text>
        </>
      )}

      {/* Decorative Corner Elements */}
      {[[-5.5, 2.5], [5.5, 2.5], [-5.5, -2.5], [5.5, -2.5]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.17]}>
          <boxGeometry args={[0.3, 0.3, 0.05]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  );
}

// Real-time Stats Visualization
function StatsPanel({ position, participants }: { position: [number, number, number], participants: any[] }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Panel Background */}
      <mesh>
        <planeGeometry args={[3, 4]} />
        <meshStandardMaterial
          color="#1e293b"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Stats Text */}
      <Text position={[0, 1.5, 0.01]} fontSize={0.3} color="#ffffff" anchorX="center">
        LIVE STATS
      </Text>
      <Text position={[0, 0.8, 0.01]} fontSize={0.25} color="#94a3b8" anchorX="center">
        Participants: {participants.length}
      </Text>
      <Text position={[0, 0.3, 0.01]} fontSize={0.25} color="#94a3b8" anchorX="center">
        Active: {participants.filter(p => p.is_speaking).length}
      </Text>

      {/* Animated Bars */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.8 + i * 0.8, -0.5, 0.01]}>
          <boxGeometry args={[0.3, Math.random() * 1 + 0.5, 0.05]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

// Enhanced 3D Meeting Room Scene
function MeetingRoomScene({ 
  agenda, 
  currentSlide, 
  presentingResource,
  participants 
}: { 
  agenda: any[], 
  currentSlide: number,
  presentingResource: any,
  participants: any[]
}) {
  return (
    <>
      <Environment preset="night" />
      <PerspectiveCamera makeDefault position={[0, 3, 12]} />
      <OrbitControls 
        enableZoom={true}
        minDistance={8}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.05}
      />
      
      {/* Particle Effects */}
      <ParticleField />

      {/* Advanced Floor with Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial 
          color="#0a0a1e"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Glowing Grid Lines */}
      <gridHelper args={[40, 40, "#1e40af", "#1e293b"]} position={[0, 0.01, 0]} />

      {/* Futuristic Conference Table */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[10, 0.15, 4]} />
        <meshStandardMaterial 
          color="#1e293b"
          metalness={0.9}
          roughness={0.1}
          emissive="#1e40af"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Main Media Screen */}
      <MediaScreen 
        resource={presentingResource || (agenda[currentSlide] ? { 
          title: agenda[currentSlide].title,
          type: 'agenda',
          description: `${agenda[currentSlide].duration_minutes} minutes`
        } : null)}
        position={[0, 4, -8]}
      />

      {/* Side Stats Panel */}
      <StatsPanel position={[8, 3, -4]} participants={participants} />

      {/* Holographic Data Points */}
      {participants.slice(0, 5).map((p, i) => (
        <HolographicDataDisplay
          key={i}
          position={[
            Math.cos((i / 5) * Math.PI * 2) * 6,
            2,
            Math.sin((i / 5) * Math.PI * 2) * 6
          ]}
          data={p}
        />
      ))}

      {/* Participant Indicators with Glow */}
      {participants.slice(0, 8).map((p, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 5;
        return (
          <group key={i}>
            <Sphere 
              position={[
                Math.cos(angle) * radius,
                1.3,
                Math.sin(angle) * radius
              ]}
              args={[0.25, 32, 32]}
            >
              <meshStandardMaterial 
                color={p.is_speaking ? "#10b981" : "#3b82f6"}
                emissive={p.is_speaking ? "#10b981" : "#3b82f6"}
                emissiveIntensity={p.is_speaking ? 1.5 : 0.8}
                metalness={0.8}
                roughness={0.2}
              />
            </Sphere>
            {/* Name Tag */}
            <Html
              position={[
                Math.cos(angle) * radius,
                1.8,
                Math.sin(angle) * radius
              ]}
              center
            >
              <div className="bg-black/80 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                {p.profiles?.full_name || 'Guest'}
              </div>
            </Html>
          </group>
        );
      })}

      {/* Advanced Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#3b82f6" />
      <pointLight position={[-8, 3, -4]} intensity={0.5} color="#8b5cf6" />
      <pointLight position={[8, 3, -4]} intensity={0.5} color="#06b6d4" />
      <spotLight
        position={[0, 10, -8]}
        angle={0.5}
        penumbra={0.5}
        intensity={1.5}
        castShadow
        target-position={[0, 0, -8]}
      />
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
  const [resources, setResources] = useState<any[]>([]);
  const [presentingResource, setPresentingResource] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    engagement: 85,
    activeTime: 0,
    interactions: 0
  });

  useEffect(() => {
    fetchMeetingData();
    setupRealtimeSubscriptions();
    
    // Simulate real-time metrics
    const metricsInterval = setInterval(() => {
      setRealTimeMetrics(prev => ({
        engagement: 70 + Math.random() * 30,
        activeTime: prev.activeTime + 1,
        interactions: prev.interactions + Math.floor(Math.random() * 2)
      }));
    }, 5000);

    return () => clearInterval(metricsInterval);
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

    // Fetch resources
    const { data: resourcesData } = await supabase
      .from('meeting_resources')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });
    
    setResources(resourcesData || []);
    
    // Find presenting resource
    const presenting = resourcesData?.find(r => r.is_presenting);
    setPresentingResource(presenting || null);
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

    // Resources updates
    const resourcesChannel = supabase
      .channel(`virtual-room-${meetingId}-resources`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_resources',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        fetchMeetingData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(transcriptionChannel);
      supabase.removeChannel(resourcesChannel);
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
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Enhanced Top Bar with Real-Time Metrics */}
      <div className="h-20 border-b border-primary/20 flex items-center justify-between px-6 bg-card/50 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              {meeting?.title}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
              <Activity className="h-3 w-3" />
              {participants.length} participants • Engagement: {realTimeMetrics.engagement.toFixed(0)}%
            </p>
          </div>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-white mr-2 animate-ping" />
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </Badge>
          )}
          <Badge variant="outline" className="animate-pulse border-green-500/50 text-green-500">
            <Zap className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="relative group"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span className="absolute -top-8 bg-black/90 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </Button>
          
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="icon"
            className="relative group"
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            <span className="absolute -top-8 bg-black/90 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              {isVideoOff ? 'Camera On' : 'Camera Off'}
            </span>
          </Button>
          
          <Button
            variant={handRaised ? "default" : "outline"}
            size="icon"
            className={`relative group ${handRaised ? 'animate-bounce' : ''}`}
            onClick={toggleHandRaise}
          >
            <Hand className="h-4 w-4" />
            <span className="absolute -top-8 bg-black/90 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              Raise Hand
            </span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Virtual Room */}
        <div className="flex-1 relative bg-gradient-to-b from-black via-slate-900 to-black">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative">
                  <Clock className="h-16 w-16 animate-spin mx-auto text-primary" />
                  <Sparkles className="h-8 w-8 absolute top-0 right-0 animate-pulse text-purple-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-white">Initializing Immersive Experience</p>
                  <p className="text-sm text-muted-foreground">Loading holographic displays...</p>
                </div>
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-primary animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          }>
            <Canvas shadows dpr={[1, 2]}>
              <MeetingRoomScene 
                agenda={agenda} 
                currentSlide={currentSlide}
                presentingResource={presentingResource}
                participants={participants}
              />
            </Canvas>
          </Suspense>

          {/* Enhanced Slide Controls */}
          {(agenda.length > 0 || presentingResource) && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 items-center">
              <div className="glass px-6 py-3 rounded-full border border-primary/30 backdrop-blur-xl flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="hover:bg-primary/20"
                >
                  ← Prev
                </Button>
                <Badge variant="default" className="px-4 py-2 font-mono text-sm">
                  {currentSlide + 1} / {agenda.length || 1}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentSlide(Math.min((agenda.length || 1) - 1, currentSlide + 1))}
                  disabled={currentSlide === (agenda.length || 1) - 1}
                  className="hover:bg-primary/20"
                >
                  Next →
                </Button>
              </div>
              {presentingResource && (
                <Badge variant="secondary" className="animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Presenting: {presentingResource.type}
                </Badge>
              )}
            </div>
          )}

          {/* Real-Time Activity Indicators */}
          <div className="absolute top-6 left-6 space-y-3">
            <div className="glass px-4 py-2 rounded-lg border border-green-500/30 backdrop-blur-xl">
              <p className="text-xs text-green-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {participants.filter(p => p.is_speaking).length} Speaking
              </p>
            </div>
            <div className="glass px-4 py-2 rounded-lg border border-orange-500/30 backdrop-blur-xl">
              <p className="text-xs text-orange-500 flex items-center gap-2">
                <Hand className="h-3 w-3" />
                {participants.filter(p => p.speaking_requested_at).length} Hands Raised
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Meeting Tools */}
        <Card className="w-[420px] border-l rounded-none bg-card/50 backdrop-blur-xl">
          <Tabs defaultValue="participants" className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-4 bg-muted/50">
              <TabsTrigger value="participants" className="data-[state=active]:bg-primary/20">
                <Users className="h-4 w-4 mr-1" />
                People
              </TabsTrigger>
              <TabsTrigger value="agenda" className="data-[state=active]:bg-primary/20">
                Agenda
              </TabsTrigger>
              <TabsTrigger value="resources" className="data-[state=active]:bg-primary/20">
                <Sparkles className="h-4 w-4 mr-1" />
                Media
              </TabsTrigger>
              <TabsTrigger value="transcription" className="data-[state=active]:bg-primary/20">
                <MessageSquare className="h-4 w-4 mr-1" />
                Live
              </TabsTrigger>
            </TabsList>

            <TabsContent value="participants" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className={`relative flex items-center gap-3 p-4 rounded-xl transition-all ${
                        p.is_speaking
                          ? 'bg-gradient-to-r from-green-500/20 to-green-500/5 border-l-4 border-green-500 animate-pulse'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                        p.is_speaking ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'
                      }`}>
                        {p.profiles?.full_name?.[0] || '?'}
                        {p.is_speaking && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{p.profiles?.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{p.role}</Badge>
                          {p.can_speak && (
                            <Badge variant="secondary" className="text-xs">
                              <Mic className="h-2 w-2 mr-1" />
                              Can speak
                            </Badge>
                          )}
                        </div>
                      </div>
                      {p.speaking_requested_at && (
                        <div className="animate-bounce">
                          <Hand className="h-5 w-5 text-orange-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="agenda" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {agenda.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`group relative p-4 rounded-xl border-l-4 cursor-pointer transition-all ${
                        idx === currentSlide
                          ? 'border-primary bg-gradient-to-r from-primary/20 to-primary/5 shadow-lg'
                          : 'border-muted/50 bg-muted/30 hover:bg-muted/50 hover:border-primary/50'
                      }`}
                      onClick={() => setCurrentSlide(idx)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={idx === currentSlide ? "default" : "outline"} className="text-xs">
                              {idx + 1}
                            </Badge>
                            {idx === currentSlide && (
                              <Badge variant="default" className="text-xs animate-pulse">
                                <Activity className="h-2 w-2 mr-1" />
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {item.duration_minutes} minutes
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {agenda.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">No agenda items yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="resources" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className={`p-4 rounded-xl transition-all ${
                        resource.is_presenting
                          ? 'bg-gradient-to-r from-purple-500/20 to-purple-500/5 border-l-4 border-purple-500 shadow-lg'
                          : 'bg-muted/30 hover:bg-muted/50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          resource.is_presenting ? 'bg-purple-500/20' : 'bg-primary/10'
                        }`}>
                          {resource.type === 'video' && <Video className="h-4 w-4" />}
                          {resource.type === 'presentation' && <Presentation className="h-4 w-4" />}
                          {resource.type === 'image' && <ImageIcon className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{resource.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                            {resource.is_presenting && (
                              <Badge variant="default" className="text-xs animate-pulse">
                                <Sparkles className="h-2 w-2 mr-1" />
                                Presenting
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {resources.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No media resources yet</p>
                      <p className="text-xs mt-1">Host can add presentations, videos, and more</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transcription" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {transcription.map((t: any, idx) => (
                    <div 
                      key={t.id} 
                      className="p-4 rounded-xl bg-gradient-to-r from-muted/50 to-muted/20 border-l-4 border-blue-500/50 animate-fade-in"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <p className="text-xs font-medium text-blue-500 mb-2 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(t.created_at).toLocaleTimeString()}
                      </p>
                      <p className="text-sm leading-relaxed">{t.text}</p>
                    </div>
                  ))}
                  {transcription.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm font-medium">Live Transcription</p>
                      <p className="text-xs mt-2">Start speaking to see real-time transcription</p>
                    </div>
                  )}
                  {transcription.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Transcribing in real-time
                    </div>
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
