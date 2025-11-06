import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, GitBranch, Rewind, FastForward, Play, Sparkles } from "lucide-react";

interface Decision {
  id: string;
  timestamp: string;
  title: string;
  alternatives: string[];
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  owner: string;
}

interface TimeTravelDecisionTrackerProps {
  meetingId: string;
  decisions: Decision[];
}

export const TimeTravelDecisionTracker = ({ meetingId, decisions }: TimeTravelDecisionTrackerProps) => {
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [timelinePosition, setTimelinePosition] = useState(100);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'from-red-500 to-rose-600';
      case 'medium': return 'from-amber-500 to-orange-600';
      case 'low': return 'from-blue-500 to-cyan-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Clock className="h-6 w-6 text-primary" />
              <motion.div
                className="absolute inset-0 bg-primary/30 rounded-full blur-lg"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h3 className="font-bold text-lg">Time-Travel Decision Tracker</h3>
              <p className="text-xs text-muted-foreground">Navigate decision evolution in time</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-2">
            <GitBranch className="h-3 w-3" />
            <span className="text-xs">{decisions.length} Decisions</span>
          </Badge>
        </div>

        {/* Timeline slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Meeting Start</span>
            <span>Current Time</span>
          </div>
          <div className="relative h-2 bg-gradient-to-r from-primary/20 via-primary/40 to-primary rounded-full overflow-hidden">
            <motion.div
              className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-600"
              style={{ width: `${timelinePosition}%` }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={timelinePosition}
              onChange={(e) => setTimelinePosition(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" className="gap-1">
              <Rewind className="h-3 w-3" />
              Rewind
            </Button>
            <Button size="sm" variant="outline" className="gap-1">
              <Play className="h-3 w-3" />
              Play
            </Button>
            <Button size="sm" variant="outline" className="gap-1">
              <FastForward className="h-3 w-3" />
              Forward
            </Button>
          </div>
        </div>

        {/* Decision nodes */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {decisions.map((decision, index) => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedDecision === decision.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedDecision(selectedDecision === decision.id ? null : decision.id)}
              >
                {/* Connection line to previous decision */}
                {index > 0 && (
                  <div className="absolute left-6 -top-3 w-0.5 h-3 bg-gradient-to-b from-primary/50 to-transparent" />
                )}

                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${getImpactColor(decision.impact)}`}>
                    <GitBranch className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">{decision.title}</h4>
                        <p className="text-xs text-muted-foreground">{decision.timestamp} · {decision.owner}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {decision.confidence}% confident
                      </Badge>
                    </div>

                    {/* Alternative paths (expanded when selected) */}
                    {selectedDecision === decision.id && decision.alternatives.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 pt-2 border-t border-border"
                      >
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Alternative Paths Considered
                        </p>
                        {decision.alternatives.map((alt, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded bg-muted/50 border border-border/50"
                          >
                            {alt}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
};
