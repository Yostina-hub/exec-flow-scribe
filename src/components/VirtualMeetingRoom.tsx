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
import { Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Clock, Users, Sparkles, Activity, Zap, Image, Presentation, Star, Crown, Lightbulb, X, Power, Square, Music } from 'lucide-react';
import * as THREE from 'three';
import { LiveTranscription } from './LiveTranscription';
import { BrowserSpeechRecognition } from './BrowserSpeechRecognition';
import { useNavigate } from 'react-router-dom';

interface VirtualMeetingRoomProps {
  meetingId: string;
  isHost: boolean;
  currentUserId: string;
  onCloseRoom?: () => void;
}

interface EventSettings {
  mode: 'standard' | 'vip' | 'conference' | 'press-briefing' | 'ceremony';
  lighting: 'ambient' | 'spotlight' | 'dramatic' | 'festive';
  backgroundTheme: 'corporate' | 'elegant' | 'futuristic' | 'minimal';
  vipParticipants: string[];
  intermission?: boolean;
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

      {/* Content Display Background */}
      <mesh position={[0, 0, 0.16]}>
        <planeGeometry args={[11.5, 5.5]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Resource Content Display using Html */}
      {resource && (
        <>
          <Html
            position={[0, 0, 0.17]}
            transform
            occlude
            style={{
              width: '1150px',
              height: '550px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Display actual content based on type */}
            {resource.type === 'image' && (
              <img 
                src={resource.url} 
                alt={resource.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            )}
            
            {resource.type === 'video' && (
              <video
                src={resource.url}
                controls
                autoPlay
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            )}
            
            {resource.type === 'presentation' && (
              (() => {
                const url: string = resource.url || '';
                const lower = url.toLowerCase();
                const isPpt = lower.endsWith('.ppt') || lower.endsWith('.pptx');
                const isGoogle = /docs\.google\.com\/presentation|drive\.google\.com/.test(lower);
                const embedSrc = isPpt
                  ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
                  : isGoogle
                  ? url.replace('/edit', '/preview')
                  : url;
                return (
                  <iframe
                    src={embedSrc}
                    title={resource.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    allow="fullscreen"
                  />
                );
              })()
            )}

            {resource.type === 'document' && (
              <iframe
                src={`${resource.url}#view=FitH`}
                title={resource.title}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            )}
          </Html>

          {/* Title and Info Overlay */}
          <Html
            position={[0, -2.5, 0.17]}
            center
            style={{
              width: '1100px',
            }}
          >
            <div style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
              padding: '20px',
              borderRadius: '8px',
            }}>
              <div style={{
                color: '#fff',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '8px',
              }}>
                {resource.title}
              </div>
              {resource.description && (
                <div style={{
                  color: '#94a3b8',
                  fontSize: '16px',
                  textAlign: 'center',
                }}>
                  {resource.description}
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '12px',
              }}>
                <span style={{
                  background: '#3b82f6',
                  color: '#fff',
                  padding: '4px 16px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  {resource.type.toUpperCase()}
                </span>
                <span style={{
                  background: '#10b981',
                  color: '#fff',
                  padding: '4px 16px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    background: '#fff',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite',
                  }} />
                  NOW PRESENTING
                </span>
              </div>
            </div>
          </Html>
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

// Speaker Spotlight Component
function SpeakerSpotlight({ 
  speaker, 
  position, 
  isVIP 
}: { 
  speaker: any, 
  position: [number, number, number],
  isVIP?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.05;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* VIP Crown */}
      {isVIP && (
        <mesh position={[0, 2, 0]}>
          <coneGeometry args={[0.3, 0.5, 8]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={1.5}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      )}

      {/* Speaker Avatar Sphere */}
      <Sphere args={[0.8, 64, 64]}>
        <meshStandardMaterial
          color={isVIP ? "#fbbf24" : "#10b981"}
          emissive={isVIP ? "#fbbf24" : "#10b981"}
          emissiveIntensity={isVIP ? 2 : 1.5}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>

      {/* Glow Ring */}
      <mesh ref={glowRef} position={[0, 0, 0]}>
        <ringGeometry args={[1, 1.2, 32]} />
        <meshBasicMaterial
          color={isVIP ? "#fbbf24" : "#10b981"}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Name Tag */}
      <Html position={[0, -1.5, 0]} center>
        <div className={`px-4 py-2 rounded-lg font-semibold text-sm backdrop-blur-sm ${
          isVIP 
            ? 'bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white shadow-xl' 
            : 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white shadow-lg'
        }`}>
          {isVIP && <Crown className="inline h-4 w-4 mr-1" />}
          {speaker.profiles?.full_name || 'Guest'}
          {isVIP && <span className="ml-2 text-xs">VIP</span>}
        </div>
      </Html>
    </group>
  );
}

// Enhanced 3D Meeting Room Scene
function MeetingRoomScene({ 
  agenda, 
  currentSlide, 
  presentingResource,
  participants,
  eventSettings,
  activeSpeaker
}: { 
  agenda: any[], 
  currentSlide: number,
  presentingResource: any,
  participants: any[],
  eventSettings: EventSettings,
  activeSpeaker: any | null
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

      {/* Center Stage for Active Speaker */}
      {activeSpeaker && !presentingResource && (
        <SpeakerSpotlight
          speaker={activeSpeaker}
          position={[0, 4, -6]}
          isVIP={eventSettings.vipParticipants.includes(activeSpeaker.user_id)}
        />
      )}

      {/* VIP Participants Display (when no active speaker) */}
      {!activeSpeaker && eventSettings.vipParticipants.length > 0 && (
        eventSettings.vipParticipants.slice(0, 3).map((vipId, idx) => {
          const vipParticipant = participants.find(p => p.user_id === vipId);
          if (!vipParticipant) return null;
          return (
            <SpeakerSpotlight
              key={vipId}
              speaker={vipParticipant}
              position={[
                (idx - 1) * 4,
                4,
                -6
              ]}
              isVIP={true}
            />
          );
        })
      )}

      {/* Advanced Lighting - Dynamic based on event settings */}
      <ambientLight intensity={eventSettings.lighting === 'ambient' ? 0.5 : 0.2} />
      <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
      
      {eventSettings.lighting === 'spotlight' && activeSpeaker && (
        <>
          <spotLight
            position={[0, 12, -4]}
            angle={0.4}
            penumbra={0.3}
            intensity={3}
            castShadow
            color="#ffffff"
          />
          <pointLight position={[0, 8, -6]} intensity={2} color="#fbbf24" />
        </>
      )}
      
      {eventSettings.lighting === 'dramatic' && (
        <>
          <spotLight position={[-5, 10, -5]} angle={0.6} intensity={2} color="#8b5cf6" />
          <spotLight position={[5, 10, -5]} angle={0.6} intensity={2} color="#06b6d4" />
          <pointLight position={[0, 2, 0]} intensity={1.5} color="#3b82f6" />
        </>
      )}
      
      {eventSettings.lighting === 'festive' && (
        <>
          <pointLight position={[-8, 6, -4]} intensity={1.2} color="#f97316" />
          <pointLight position={[8, 6, -4]} intensity={1.2} color="#8b5cf6" />
          <pointLight position={[0, 8, 0]} intensity={1} color="#fbbf24" />
          <pointLight position={[0, 4, -8]} intensity={1.5} color="#10b981" />
        </>
      )}
      
      {eventSettings.lighting === 'ambient' && (
        <>
          <pointLight position={[0, 8, 0]} intensity={0.8} color="#3b82f6" />
          <pointLight position={[-8, 3, -4]} intensity={0.5} color="#8b5cf6" />
          <pointLight position={[8, 3, -4]} intensity={0.5} color="#06b6d4" />
        </>
      )}
    </>
  );
}

export function VirtualMeetingRoom({ meetingId, isHost, currentUserId, onCloseRoom }: VirtualMeetingRoomProps) {
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
  const [isPaused, setIsPaused] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    engagement: 85,
    activeTime: 0,
    interactions: 0
  });
  const [eventSettings, setEventSettings] = useState<EventSettings>({
    mode: 'standard',
    lighting: 'ambient',
    backgroundTheme: 'futuristic',
    vipParticipants: [],
    intermission: false,
  });
  const [activeSpeaker, setActiveSpeaker] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [ambientOn, setAmbientOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const noiseSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const navigate = useNavigate();

  // Presence tracking for join/leave notifications
  useEffect(() => {
    const presenceChannel = supabase
      .channel(`meeting-presence-${meetingId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const userIds = Object.keys(state).flatMap(key => 
          state[key].map((presence: any) => presence.user_id)
        );
        setOnlineUsers(userIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence: any) => {
          const participant = participants.find(p => p.user_id === presence.user_id);
          const name = participant?.profiles?.full_name || 'Someone';
          toast({
            title: "Participant Joined",
            description: `${name} joined the meeting`,
          });
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          const participant = participants.find(p => p.user_id === presence.user_id);
          const name = participant?.profiles?.full_name || 'Someone';
          toast({
            title: "Participant Left",
            description: `${name} left the meeting`,
            variant: "destructive",
          });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [meetingId, currentUserId, participants]);

  // Ensure current user is recorded as an attendee (prevents empty participant list)
  useEffect(() => {
    const ensureAttendee = async () => {
      try {
        if (!currentUserId || !meetingId) return;
        const { data: existing } = await supabase
          .from('meeting_attendees')
          .select('id')
          .eq('meeting_id', meetingId)
          .eq('user_id', currentUserId)
          .maybeSingle();
        if (!existing) {
          const { error: insErr } = await supabase
            .from('meeting_attendees')
            .insert({ meeting_id: meetingId, user_id: currentUserId, attended: true, role: 'optional' });
          if (insErr) {
            console.warn('Could not insert attendee (likely RLS):', insErr);
          }
        }
      } catch (e) {
        console.warn('ensureAttendee failed', e);
      }
    };
    void ensureAttendee();
  }, [meetingId, currentUserId]);


  // Derived: displayed participants (active first, online first)
  const displayedParticipants = [...participants].sort((a, b) => {
    if (activeSpeaker && a.user_id === activeSpeaker.user_id) return -1;
    if (activeSpeaker && b.user_id === activeSpeaker.user_id) return 1;
    const aOnline = onlineUsers.includes(a.user_id);
    const bOnline = onlineUsers.includes(b.user_id);
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '');
  });

  // Ambient audio helpers
  const createNoiseBuffer = (audioCtx: AudioContext) => {
    const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02; // simple brown noise
      lastOut = data[i];
      data[i] *= 0.3; // lower amplitude
    }
    return buffer;
  };

  const startAmbient = async () => {
    if (ambientOn && audioCtxRef.current) return;
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    gain.gain.value = 0.05; // very low volume by default
    comp.threshold.value = -24;
    comp.knee.value = 30;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;

    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx);
    src.loop = true;

    src.connect(comp);
    comp.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);

    audioCtxRef.current = ctx;
    gainRef.current = gain;
    compressorRef.current = comp;
    noiseSrcRef.current = src;
    setAmbientOn(true);
  };

  const stopAmbient = () => {
    try {
      noiseSrcRef.current?.stop();
    } catch {}
    noiseSrcRef.current = null;
    gainRef.current = null;
    compressorRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setAmbientOn(false);
  };

  // React to intermission state
  useEffect(() => {
    if (eventSettings.intermission) startAmbient();
    else stopAmbient();
  }, [eventSettings.intermission]);


  // Detect active speaker
  useEffect(() => {
    const speakingParticipant = participants.find(p => p.is_speaking);
    if (speakingParticipant && speakingParticipant.id !== activeSpeaker?.id) {
      setActiveSpeaker(speakingParticipant);
    } else if (!speakingParticipant && activeSpeaker) {
      // Keep showing speaker for 2 seconds after they stop
      const timeout = setTimeout(() => setActiveSpeaker(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [participants]);

  // Listen for event settings from host
  useEffect(() => {
    const channel = supabase
      .channel(`event-settings-${meetingId}`)
      .on('broadcast', { event: 'settings-update' }, ({ payload }) => {
        setEventSettings(payload);
        toast({
          title: "Event Settings Updated",
          description: `Mode: ${payload.mode}, Lighting: ${payload.lighting}`,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  // Listen for hand raise notifications (host only)
  useEffect(() => {
    if (!isHost) return;

    const handRaiseChannel = supabase
      .channel(`hand-raise-${meetingId}`)
      .on('broadcast', { event: 'hand-raised' }, ({ payload }) => {
        const participant = participants.find(p => p.user_id === payload.user_id);
        const name = participant?.profiles?.full_name || 'A participant';
        toast({
          title: "Hand Raised",
          description: `${name} would like to speak`,
          action: participant ? (
            <Button
              size="sm"
              onClick={async () => {
                await supabase
                  .from('meeting_attendees')
                  .update({ can_speak: true })
                  .eq('meeting_id', meetingId)
                  .eq('user_id', payload.user_id);
                toast({
                  title: "Permission Granted",
                  description: `${name} can now speak`,
                });
              }}
            >
              Allow
            </Button>
          ) : undefined,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(handRaiseChannel);
    };
  }, [meetingId, isHost, participants]);

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

  // Meeting duration timer (total time in meeting)
  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMeetingData = async () => {
    const { data: meetingData } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();
    
    setMeeting(meetingData);
    // Auto-start recording for any meeting that isn't completed
    const status: string | undefined = meetingData?.status;
    const shouldRecord = status !== 'completed';
    
    console.log('VirtualRoom: Auto-start recording?', { status, shouldRecord });
    
    if (shouldRecord && !isRecording) {
      setIsRecording(true);
      console.log('VirtualRoom: Recording auto-started');
    }
    
    // Update meeting status to in_progress if it's scheduled
    if (status === 'scheduled') {
      await supabase
        .from('meetings')
        .update({ 
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', meetingId);
    }

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

    // Broadcast hand raise event for real-time notification
    if (newValue) {
      const channel = supabase.channel(`hand-raise-${meetingId}`);
      await channel.send({
        type: 'broadcast',
        event: 'hand-raised',
        payload: {
          user_id: currentUserId,
          timestamp: new Date().toISOString()
        }
      });
    }

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

  const handleEndMeeting = async () => {
    if (!isHost) return;
    try {
      // Stop recording first
      console.log('VirtualRoom: Stopping recording...');
      setIsRecording(false);
      setIsPaused(false);

      // Mark meeting completed - this will prevent others from rejoining
      await supabase
        .from('meetings')
        .update({ 
          status: 'completed',
          actual_end_time: new Date().toISOString()
        })
        .eq('id', meetingId);

      // Broadcast meeting ended to all participants
      const broadcastChannel = supabase.channel(`meeting-ended-${meetingId}`);
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'meeting-ended',
        payload: { meetingId }
      });

      toast({
        title: "Meeting Ended",
        description: "All participants have been notified",
      });

      // Close the room
      setTimeout(() => {
        onCloseRoom?.();
      }, 2000);
    } catch (e: any) {
      console.error('VirtualRoom: End meeting failed:', e);
      toast({
        title: "Error",
        description: "Failed to end meeting properly",
        variant: "destructive",
      });
      // Still close the room
      onCloseRoom?.();
    }
  };

  // Listen for meeting ended event (non-host participants)
  useEffect(() => {
    if (isHost) return;

    const endChannel = supabase
      .channel(`meeting-ended-${meetingId}`)
      .on('broadcast', { event: 'meeting-ended' }, () => {
        toast({
          title: "Meeting Ended",
          description: "The host has ended this meeting",
          variant: "destructive",
        });
        setTimeout(() => {
          onCloseRoom?.();
          navigate('/meetings');
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(endChannel);
    };
  }, [meetingId, isHost, onCloseRoom, navigate]);
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
                {onlineUsers.length} participants • Engagement: {realTimeMetrics.engagement.toFixed(0)}%
              </p>
          </div>
          
          {/* Meeting Duration Timer - Always Visible */}
          <div className="flex flex-col items-center px-4 py-2 rounded-lg border border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Meeting Duration</p>
            <Badge variant="outline" className="font-mono text-lg px-4 py-1 border-primary/50">
              <Clock className="h-4 w-4 mr-2" />
              {formatTime(meetingDuration)}
            </Badge>
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
          {/* Recording Toggle */}
          <Button
            variant={isRecording ? "destructive" : "default"}
            className="gap-2"
            onClick={() => {
              const newState = !isRecording;
              setIsRecording(newState);
              setIsPaused(false);
              console.log('VirtualRoom: Recording toggled:', newState);
              toast({
                title: newState ? 'Recording Started' : 'Recording Stopped',
                description: newState ? 'Live transcription is active' : 'Recording saved'
              });
            }}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4 animate-pulse" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>

          {/* Pause/Resume Button - only show when recording */}
          {isRecording && (
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => {
                const newPauseState = !isPaused;
                setIsPaused(newPauseState);
                console.log('VirtualRoom: Recording paused:', newPauseState);
                toast({
                  title: newPauseState ? 'Recording Paused' : 'Recording Resumed',
                  description: newPauseState ? 'Transcription paused' : 'Transcription resumed'
                });
              }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}

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

          {/* Host End Meeting Button */}
          {isHost && (
            <Button
              variant="destructive"
              className="gap-2 font-semibold"
              onClick={handleEndMeeting}
            >
              <Power className="h-4 w-4" />
              End Meeting
            </Button>
          )}
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
                eventSettings={eventSettings}
                activeSpeaker={activeSpeaker}
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
                  {/* Raised Hands Section - Host View */}
                  {isHost && participants.filter(p => p.speaking_requested_at).length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-500/20 to-yellow-500/10 border-2 border-orange-500">
                      <div className="flex items-center gap-2 mb-3">
                        <Hand className="h-5 w-5 text-orange-500 animate-bounce" />
                        <p className="text-sm font-semibold text-orange-500">
                          RAISED HANDS ({participants.filter(p => p.speaking_requested_at).length})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {participants
                          .filter(p => p.speaking_requested_at)
                          .map(participant => (
                            <div 
                              key={participant.user_id}
                              className="flex items-center justify-between p-2 rounded-lg bg-background/50"
                            >
                              <p className="text-sm font-medium">
                                {participant.profiles?.full_name || 'Unknown'}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await supabase
                                    .from('meeting_attendees')
                                    .update({ 
                                      can_speak: true,
                                      speaking_requested_at: null 
                                    })
                                    .eq('meeting_id', meetingId)
                                    .eq('user_id', participant.user_id);
                                  toast({
                                    title: "Permission Granted",
                                    description: `${participant.profiles?.full_name} can now speak`,
                                  });
                                }}
                              >
                                Allow to Speak
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Active Speaker Display */}
                  {activeSpeaker && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/10 border-2 border-green-500 animate-pulse">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        <p className="text-sm font-semibold text-green-500">ACTIVE SPEAKER</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl bg-green-500 text-white">
                          {activeSpeaker.profiles?.full_name?.[0] || '?'}
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full animate-ping" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{activeSpeaker.profiles?.full_name}</p>
                          <Badge variant="default" className="mt-1 bg-green-500">
                            <Mic className="h-3 w-3 mr-1" />
                            Speaking Now
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIP Participants Section */}
                  {eventSettings.vipParticipants.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <p className="text-sm font-semibold text-yellow-500">VIP GUESTS</p>
                      </div>
                      <div className="space-y-2">
                        {participants
                          .filter(p => eventSettings.vipParticipants.includes(p.user_id))
                          .map((vip) => (
                            <div
                              key={vip.id}
                              className="relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border-2 border-yellow-500/50"
                            >
                              <div className="relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                                <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400" />
                                {vip.profiles?.full_name?.[0] || '?'}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold">{vip.profiles?.full_name}</p>
                                <Badge variant="default" className="mt-1 bg-gradient-to-r from-yellow-500 to-orange-500">
                                  <Star className="h-2 w-2 mr-1" />
                                  VIP
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Participants */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">ALL PARTICIPANTS</p>
                    {displayedParticipants.map((p) => (
                      <div
                        key={p.id}
                        className={`relative flex items-center gap-3 p-4 rounded-xl transition-all mb-2 ${
                          p.is_speaking
                            ? 'bg-gradient-to-r from-green-500/20 to-green-500/5 border-l-4 border-green-500'
                            : eventSettings.vipParticipants.includes(p.user_id)
                            ? 'opacity-50'
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                          p.is_speaking 
                            ? 'bg-green-500 text-white' 
                            : eventSettings.vipParticipants.includes(p.user_id)
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                            : 'bg-primary text-primary-foreground'
                        }`}>
                          {p.profiles?.full_name?.[0] || '?'}
                          {onlineUsers.includes(p.user_id) && (
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                          )}
                          {p.is_speaking && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate flex items-center gap-2">
                            {p.profiles?.full_name}
                            {eventSettings.vipParticipants.includes(p.user_id) && (
                              <Star className="h-3 w-3 text-yellow-500" />
                            )}
                            <Badge variant={onlineUsers.includes(p.user_id) ? 'secondary' : 'outline'} className="text-[10px]">
                              {onlineUsers.includes(p.user_id) ? 'Online' : 'Offline'}
                            </Badge>
                          </p>
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
                          {resource.type === 'image' && <Image className="h-4 w-4" />}
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

            <TabsContent value="transcription" forceMount className="flex-1 overflow-hidden p-4">
              <div className="space-y-4">
                {/* Hidden BrowserSpeechRecognition component that handles actual recording */}
                <div className="hidden">
                  <BrowserSpeechRecognition
                    meetingId={meetingId}
                    externalIsRecording={isRecording}
                    isPaused={isPaused}
                    onDurationChange={(seconds) => setRecordingTime(seconds)}
                  />
                </div>
                
                {/* Display live transcription */}
                <LiveTranscription meetingId={meetingId} isRecording={isRecording} />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
