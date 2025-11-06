import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Zap, TrendingUp, AlertTriangle, Lightbulb, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NeuralCommandCenterProps {
  meetingId: string;
  meetingPhase: 'pre' | 'active' | 'post';
  onActionSuggestion: (action: string) => void;
}

export const NeuralCommandCenter = ({ meetingId, meetingPhase, onActionSuggestion }: NeuralCommandCenterProps) => {
  const [activeInsight, setActiveInsight] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(0.5);

  const insights = [
    {
      icon: Lightbulb,
      title: "Smart Context Detected",
      description: "Based on past decisions, suggest budget reallocation",
      confidence: 94,
      priority: "high",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: Target,
      title: "Action Item Predicted",
      description: "Follow-up email to stakeholders likely needed",
      confidence: 87,
      priority: "medium",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: TrendingUp,
      title: "Engagement Rising",
      description: "Participant energy increased 32% in last 5min",
      confidence: 91,
      priority: "info",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: AlertTriangle,
      title: "Time Anomaly",
      description: "Running 12min behind schedule, suggest skip agenda item 3",
      confidence: 89,
      priority: "urgent",
      color: "from-red-500 to-rose-600"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveInsight((prev) => (prev + 1) % insights.length);
      setPulseIntensity(Math.random() * 0.5 + 0.5);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      info: "outline"
    };
    return variants[priority as keyof typeof variants] || "outline";
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Neural network background animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.3),transparent_50%)]" 
             style={{ animation: 'pulse 3s ease-in-out infinite' }} />
      </div>

      <div className="relative p-6 space-y-4">
        {/* Header with brain activity indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-8 w-8 text-primary" />
              <motion.div
                className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h3 className="font-bold text-lg">Neural Command Center</h3>
              <p className="text-xs text-muted-foreground">AI-Powered Meeting Intelligence</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-2">
            <Zap className="h-3 w-3 text-amber-500" />
            <span className="text-xs">Live Analysis</span>
          </Badge>
        </div>

        {/* Active insight carousel */}
        <div className="min-h-[120px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeInsight}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <div className={`p-4 rounded-lg bg-gradient-to-r ${insights[activeInsight].color} bg-opacity-10 border border-current/20`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-background/80">
                    {(() => {
                      const Icon = insights[activeInsight].icon;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{insights[activeInsight].title}</h4>
                      <Badge variant={getPriorityBadge(insights[activeInsight].priority) as any} className="text-xs">
                        {insights[activeInsight].confidence}% confident
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insights[activeInsight].description}</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => onActionSuggestion(insights[activeInsight].title)}
                    >
                      Execute Suggestion
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Insight indicators */}
        <div className="flex gap-2 justify-center">
          {insights.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveInsight(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeInsight ? 'w-8 bg-primary' : 'w-2 bg-primary/30'
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};
