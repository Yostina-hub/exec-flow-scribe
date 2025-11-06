import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Users, Activity, Mic, Eye, Brain } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  initials: string;
  engagement: number;
  speaking: boolean;
  attention: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface SpatialPresenceMapProps {
  meetingId: string;
  participants: Participant[];
}

export const SpatialPresenceMap = ({ meetingId, participants }: SpatialPresenceMapProps) => {
  const [hoveredParticipant, setHoveredParticipant] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'circular' | 'grid'>('circular');

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'from-green-500 to-emerald-600';
      case 'negative': return 'from-red-500 to-rose-600';
      default: return 'from-blue-500 to-cyan-600';
    }
  };

  const getEngagementSize = (engagement: number) => {
    if (engagement > 80) return 'scale-110';
    if (engagement > 50) return 'scale-100';
    return 'scale-90';
  };

  const renderCircularView = () => {
    const radius = 140;
    const centerX = 200;
    const centerY = 200;

    return (
      <div className="relative w-full h-[400px]">
        {/* Central meeting core */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/30">
            <Brain className="h-8 w-8 text-primary" />
          </div>
        </motion.div>

        {/* Participants in orbit */}
        {participants.map((participant, index) => {
          const angle = (index / participants.length) * 2 * Math.PI;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          return (
            <motion.div
              key={participant.id}
              className="absolute"
              style={{ left: x, top: y }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: participant.speaking ? [-3, 3, -3] : 0,
              }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                x: { duration: 0.3, repeat: participant.speaking ? Infinity : 0 }
              }}
              onHoverStart={() => setHoveredParticipant(participant.id)}
              onHoverEnd={() => setHoveredParticipant(null)}
            >
              <div className={`relative ${getEngagementSize(participant.engagement)} transition-transform`}>
                {/* Engagement ring */}
                <svg className="absolute inset-0 -m-3 w-20 h-20" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-primary/20"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - participant.engagement / 100)}`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>

                <Avatar className={`h-14 w-14 border-2 ${participant.speaking ? 'border-amber-500 shadow-lg shadow-amber-500/50' : 'border-primary/30'}`}>
                  <AvatarFallback className={`bg-gradient-to-br ${getSentimentColor(participant.sentiment)} text-white font-bold`}>
                    {participant.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Status indicators */}
                {participant.speaking && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Mic className="h-3 w-3 text-white" />
                  </motion.div>
                )}

                {/* Hover card */}
                {hoveredParticipant === participant.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-background border border-border rounded-lg shadow-xl z-10"
                  >
                    <p className="font-semibold text-sm mb-2">{participant.name}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Engagement</span>
                        <span className="font-medium">{participant.engagement}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Attention</span>
                        <span className="font-medium">{participant.attention}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sentiment</span>
                        <Badge variant="outline" className="text-xs">{participant.sentiment}</Badge>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Spatial Presence Map</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {participants.length} Active
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Eye className="h-3 w-3" />
              Real-time
            </Badge>
          </div>
        </div>

        {renderCircularView()}

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Negative</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
