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
import { Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Clock, Users, Sparkles, Activity, Zap, Image, Presentation, Star, Crown, Lightbulb, X, Power, Square, Music, Brain, Paintbrush } from 'lucide-react';
import * as THREE from 'three';
import { LiveTranscription } from './LiveTranscription';
import { BrowserSpeechRecognition } from './BrowserSpeechRecognition';
import { useNavigate } from 'react-router-dom';
import { soundFX } from '@/utils/soundEffects';
import { PresenterControls } from './PresenterControls';
import { AIMeetingCopilot } from './AIMeetingCopilot';
import { SmartWhiteboard } from './SmartWhiteboard';
import { cn } from '@/lib/utils';

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
  ambientVolume?: number;
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
        resource={presentingResource}
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

      {/* Participant Indicators with Glow - Active speaker gets center stage */}
      {participants.slice(0, 8).map((p, i) => {
        const isSpeaking = activeSpeaker && p.user_id === activeSpeaker.user_id;
        const isVIP = eventSettings.vipParticipants.includes(p.user_id);
        
        // Active speaker gets prominent center-front position
        const angle = isSpeaking ? 0 : ((i + 1) / 8) * Math.PI * 2;
        const radius = isSpeaking ? 3 : 6;
        const height = isSpeaking ? 1.5 : 1;
        
        return (
          <group key={p.id} position={[
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius - (isSpeaking ? 2 : 0)
          ]}>
            {/* Main Avatar Sphere */}
            <Sphere args={[isSpeaking ? 1.2 : 0.4, 32, 32]} castShadow>
              <meshStandardMaterial
                color={isSpeaking ? "#10b981" : isVIP ? "#fbbf24" : "#3b82f6"}
                emissive={isSpeaking ? "#10b981" : isVIP ? "#fbbf24" : "#3b82f6"}
                emissiveIntensity={isSpeaking ? 2 : isVIP ? 1 : 0.5}
                metalness={0.8}
                roughness={0.2}
              />
            </Sphere>
            
            {/* Speaking Animation - Expanding Rings */}
            {isSpeaking && (
              <>
                <mesh>
                  <ringGeometry args={[1.5, 1.8, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <ringGeometry args={[2, 2.3, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.2} side={THREE.DoubleSide} />
                </mesh>
              </>
            )}
            
            {/* VIP Crown */}
            {isVIP && (
              <mesh position={[0, isSpeaking ? 1.5 : 0.6, 0]}>
                <coneGeometry args={[0.3, 0.5, 8]} />
                <meshStandardMaterial
                  color="#fbbf24"
                  emissive="#fbbf24"
                  emissiveIntensity={1.5}
                  metalness={0.9}
                />
              </mesh>
            )}
            
            {/* Name Label */}
            <Html position={[0, isSpeaking ? -2 : -0.8, 0]} center>
              <div className={`px-3 py-1 rounded-lg backdrop-blur-sm font-semibold text-xs ${
                isSpeaking 
                  ? 'bg-green-500/90 text-white text-lg animate-pulse' 
                  : isVIP
                  ? 'bg-yellow-500/80 text-white'
                  : 'bg-blue-500/70 text-white'
              }`}>
                {p.profiles?.full_name || 'Unknown'}
              </div>
            </Html>
            
            {/* Spotlight from above for active speaker */}
            {isSpeaking && (
              <pointLight
                position={[0, 5, 0]}
                intensity={3}
                distance={10}
                color="#10b981"
                castShadow
              />
            )}
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
      <ambientLight intensity={eventSettings.intermission ? 0.2 : (eventSettings.lighting === 'ambient' ? 0.5 : 0.2)} />
      <directionalLight position={[10, 15, 10]} intensity={eventSettings.intermission ? 0.3 : 1} castShadow />
      
      {eventSettings.lighting === 'spotlight' && activeSpeaker && (
        <>
          <spotLight
            position={[0, 12, -4]}
            angle={0.4}
            penumbra={0.3}
            intensity={eventSettings.intermission ? 1 : 3}
            castShadow
            color="#ffffff"
          />
          <pointLight position={[0, 8, -6]} intensity={eventSettings.intermission ? 0.5 : 2} color="#fbbf24" />
        </>
      )}
      
      {eventSettings.lighting === 'dramatic' && (
        <>
          <spotLight position={[-5, 10, -5]} angle={0.6} intensity={eventSettings.intermission ? 0.8 : 2} color="#8b5cf6" />
          <spotLight position={[5, 10, -5]} angle={0.6} intensity={eventSettings.intermission ? 0.8 : 2} color="#06b6d4" />
          <pointLight position={[0, 2, 0]} intensity={eventSettings.intermission ? 0.5 : 1.5} color="#3b82f6" />
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
          <pointLight position={[0, 8, 0]} intensity={eventSettings.intermission ? 0.3 : 0.8} color="#3b82f6" />
          <pointLight position={[-8, 3, -4]} intensity={eventSettings.intermission ? 0.2 : 0.5} color="#8b5cf6" />
          <pointLight position={[8, 3, -4]} intensity={eventSettings.intermission ? 0.2 : 0.5} color="#06b6d4" />
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
  const [presentationSlide, setPresentationSlide] = useState(0);
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
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const noiseSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const navigate = useNavigate();
  
  // AI Features Quick Access States
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // Keyboard shortcuts for AI features
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B for AI Copilot
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setShowAICopilot(prev => !prev);
        toast({
          title: showAICopilot ? "AI Copilot Closed" : "AI Copilot Opened",
          description: showAICopilot ? "" : "Press Ctrl+B to close",
        });
      }
      // Ctrl/Cmd + W for Whiteboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        setShowWhiteboard(prev => !prev);
        toast({
          title: showWhiteboard ? "Whiteboard Closed" : "Whiteboard Opened",
          description: showWhiteboard ? "" : "Press Ctrl+W to close",
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAICopilot, showWhiteboard, toast]);

  // Proactive AI insights based on meeting activity
  useEffect(() => {
    if (!meetingId || participants.length === 0) return;

    const insights = [
      "Consider summarizing key points for latecomers",
      "High engagement detected! Great participation.",
      `${participants.length} participants present. Good turnout!`,
      "Reminder: Review action items before closing",
      "Time check: Ensure all agenda items are covered",
    ];

    // Show AI insight every 5 minutes
    const interval = setInterval(() => {
      const randomInsight = insights[Math.floor(Math.random() * insights.length)];
      setAiInsight(randomInsight);
      
      // Auto-hide after 10 seconds
      setTimeout(() => setAiInsight(null), 10000);
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [meetingId, participants.length]);

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
          soundFX.playJoin();
          toast({
            title: 'Participant Joined',
            description: `${name} joined the meeting`,
          });
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          const userId = presence.user_id;
          
          // Don't show toast for self or temporary disconnections
          if (userId === currentUserId) return;
          
          // Wait 3 seconds to confirm they really left (not just network hiccup)
          setTimeout(() => {
            const state = presenceChannel.presenceState();
            const stillGone = !Object.keys(state).some(stateKey => 
              state[stateKey].some((p: any) => p.user_id === userId)
            );
            
            if (stillGone) {
              const participant = participants.find(p => p.user_id === userId);
              const name = participant?.profiles?.full_name || 'Someone';
              soundFX.playLeave();
              toast({
                title: 'Participant Left',
                description: `${name} left the meeting`,
                variant: 'destructive',
              });
            }
          }, 3000);
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

    // Heartbeat to keep mobile sessions alive and recover from backgrounding
    const heartbeat = setInterval(() => {
      presenceChannel.track({
        user_id: currentUserId,
        online_at: new Date().toISOString(),
      }).catch(() => {/* no-op */});
    }, 20000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        presenceChannel.track({
          user_id: currentUserId,
          online_at: new Date().toISOString(),
        }).catch(() => {/* no-op */});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      supabase.removeChannel(presenceChannel);
    };
  }, [meetingId, currentUserId, participants]);

  // Listen for kick events
  useEffect(() => {
    const kickChannel = supabase
      .channel(`meeting:${meetingId}`)
      .on('broadcast', { event: 'participant_kicked' }, ({ payload }) => {
        if (payload.userId === currentUserId) {
          toast({
            title: "Removed from Meeting",
            description: "You have been removed from this meeting by the host",
            variant: "destructive",
          });
          // Redirect to meetings page after a short delay
          setTimeout(() => {
            navigate('/meetings');
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kickChannel);
    };
  }, [meetingId, currentUserId, navigate, toast]);

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
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        setAudioError("Audio not supported in this browser");
        return;
      }

      const ctx = new AudioContextClass();
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const gain = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      gain.gain.value = eventSettings.ambientVolume || 0.05;
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
      setAudioError(null);
      
      toast({
        title: "Intermission Started",
        description: "Ambient soundscape is playing",
      });
    } catch (err) {
      console.error("Failed to start ambient audio:", err);
      setAudioError("Could not start ambient audio");
      toast({
        title: "Audio Error",
        description: "Ambient audio not available",
        variant: "destructive",
      });
    }
  };

  const stopAmbient = () => {
    try {
      if (noiseSrcRef.current) {
        noiseSrcRef.current.stop();
        noiseSrcRef.current = null;
      }
    } catch (err) {
      console.warn("Error stopping audio source:", err);
    }
    
    gainRef.current = null;
    compressorRef.current = null;
    
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (err) {
        console.warn("Error closing audio context:", err);
      }
      audioCtxRef.current = null;
    }
    setAmbientOn(false);
  };

  // React to intermission state
  useEffect(() => {
    if (eventSettings.intermission) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
  }, [eventSettings.intermission]);

  // Update volume when changed
  useEffect(() => {
    if (gainRef.current && eventSettings.ambientVolume !== undefined) {
      try {
        gainRef.current.gain.value = eventSettings.ambientVolume;
      } catch (err) {
        console.warn("Error setting volume:", err);
      }
    }
  }, [eventSettings.ambientVolume]);


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
        soundFX.playNotification();
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
          status: 'in_progress'
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
    
    // Don't automatically show presentations - presenter controls them manually
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
      soundFX.playHandRaise();
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
      soundFX.playEndMeeting();
      const broadcastChannel = supabase.channel(`meeting-ended-${meetingId}`);
      await broadcastChannel.send({
        type: 'broadcast',
        event: 'meeting-ended',
        payload: { meetingId }
      });

      toast({
        title: "Meeting Ended",
        description: "Generating minutes for virtual room...",
      });

      // Auto-generate minutes for virtual room
      console.log('VirtualRoom: Auto-generating minutes...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase.functions.invoke('generate-virtual-room-minutes', {
            body: { meetingId },
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });

          if (error) {
            console.error('VirtualRoom: Minutes generation error:', error);
          } else if (data?.error) {
            console.error('VirtualRoom: Minutes generation failed:', data.error);
          } else {
            console.log('VirtualRoom: Minutes generated successfully');
            toast({
              title: "✨ Minutes Ready",
              description: "Virtual room minutes have been generated",
            });
          }
        }
      } catch (minutesError) {
        console.error('VirtualRoom: Minutes generation exception:', minutesError);
        // Don't block room closure on minutes error
      }

      // Close the room
      setTimeout(() => {
        onCloseRoom?.();
      }, 2500);
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
          {eventSettings.intermission ? (
            <Badge variant="secondary" className="animate-pulse border-purple-500/50 text-purple-500 px-4 py-2">
              <Music className="h-3 w-3 mr-1" />
              INTERMISSION
            </Badge>
          ) : (
            <Badge variant="outline" className="animate-pulse border-green-500/50 text-green-500">
              <Zap className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Recording Controls - Host Only */}
          {isHost && (
            <>
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
            </>
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
          {/* Intermission Overlay */}
          {eventSettings.intermission && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center space-y-6 animate-fade-in">
                <div className="relative">
                  <Music className="h-32 w-32 mx-auto text-purple-500 animate-pulse" />
                  <div className="absolute inset-0 bg-purple-500/30 blur-3xl animate-pulse" />
                </div>
                <div>
                  <h2 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
                    Intermission
                  </h2>
                  <p className="text-2xl text-white/80">Meeting will resume shortly</p>
                  <div className="mt-6 flex justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-full bg-purple-500 animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
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

          {/* Enhanced Slide Controls - Only show for presenter when actively presenting */}
          {presentingResource && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 items-center">
              <div className="glass px-6 py-3 rounded-full border border-primary/30 backdrop-blur-xl flex items-center gap-3">
                <Badge variant="secondary" className="animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Presenting: {presentingResource.title}
                </Badge>
              </div>
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
          
          {/* AI Insight Banner - Proactive Display */}
          {aiInsight && (
            <div className="absolute top-6 right-6 max-w-md animate-slide-in-right">
              <div className="glass p-4 rounded-xl border-2 border-purple-500/50 backdrop-blur-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-purple-400 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-purple-400 mb-1">AI INSIGHT</p>
                    <p className="text-sm text-white/90">{aiInsight}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 hover:bg-white/10"
                    onClick={() => setAiInsight(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Buttons - Quick AI Access */}
          <div className="absolute right-6 bottom-24 flex flex-col gap-3">
            {/* AI Copilot FAB */}
            <Button
              size="lg"
              onClick={() => setShowAICopilot(!showAICopilot)}
              className={cn(
                "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110",
                showAICopilot 
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse" 
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              )}
            >
              <Brain className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background animate-ping" />
            </Button>
            
            {/* Smart Whiteboard FAB */}
            <Button
              size="lg"
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className={cn(
                "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110",
                showWhiteboard 
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 animate-pulse" 
                  : "bg-gradient-to-r from-blue-500 to-cyan-500"
              )}
            >
              <Paintbrush className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* AI Copilot Floating Panel */}
        {showAICopilot && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-4xl h-[80vh] m-6 shadow-2xl border-2 border-purple-500/50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
                    <h3 className="text-lg font-semibold">AI Meeting Copilot</h3>
                    <Badge variant="secondary" className="ml-2">
                      <Zap className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAICopilot(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <AIMeetingCopilot 
                    meetingId={meetingId}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Smart Whiteboard Floating Panel */}
        {showWhiteboard && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-6xl h-[85vh] m-6 shadow-2xl border-2 border-blue-500/50">
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <Paintbrush className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold">Smart Whiteboard</h3>
                    <Badge variant="secondary" className="ml-2">
                      <Users className="h-3 w-3 mr-1" />
                      Collaborative
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowWhiteboard(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SmartWhiteboard 
                    meetingId={meetingId}
                    currentUserId={currentUserId}
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Right Sidebar - Meeting Tools */}
        <Card className="w-[420px] border-l rounded-none bg-card/50 backdrop-blur-xl">
          <Tabs defaultValue="participants" className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-5 bg-muted/50">
              <TabsTrigger value="participants" className="data-[state=active]:bg-primary/20">
                <Users className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="agenda" className="data-[state=active]:bg-primary/20">
                Agenda
              </TabsTrigger>
              <TabsTrigger value="presenter" className="data-[state=active]:bg-primary/20">
                <Presentation className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="resources" className="data-[state=active]:bg-primary/20">
                <Sparkles className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="transcription" className="data-[state=active]:bg-primary/20">
                <MessageSquare className="h-4 w-4" />
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

            <TabsContent value="presenter" className="flex-1 overflow-hidden">
              <PresenterControls 
                meetingId={meetingId}
                isHost={isHost}
                onPresentationChange={(resource, slideIndex) => {
                  setPresentingResource(resource);
                  setPresentationSlide(slideIndex);
                }}
              />
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
                <LiveTranscription 
                  meetingId={meetingId} 
                  isRecording={isRecording}
                  currentUserName={participants.find(p => p.user_id === currentUserId)?.profiles?.full_name || 'Unknown User'}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
