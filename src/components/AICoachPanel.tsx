import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, MessageCircle, TrendingUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface CoachingTip {
  id: string;
  type: 'suggestion' | 'warning' | 'insight';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

interface AICoachPanelProps {
  meetingId: string;
}

export const AICoachPanel = ({ meetingId }: AICoachPanelProps) => {
  const [tips, setTips] = useState<CoachingTip[]>([
    {
      id: '1',
      type: 'suggestion',
      message: 'Great momentum! Consider capturing this decision in the minutes.',
      priority: 'high',
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'insight',
      message: 'Two participants haven\'t spoken in 10 minutes. Time to engage them?',
      priority: 'medium',
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: '3',
      type: 'warning',
      message: 'Meeting running 15 minutes over. Consider wrapping up or extending.',
      priority: 'high',
      timestamp: new Date(Date.now() - 300000),
    },
  ]);

  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    // Simulate real-time coaching tips
    const interval = setInterval(() => {
      const newTips: CoachingTip[] = [
        {
          id: String(Math.random()),
          type: 'suggestion',
          message: 'Positive energy detected! Perfect time to discuss challenging topics.',
          priority: 'medium',
          timestamp: new Date(),
        },
        {
          id: String(Math.random()),
          type: 'insight',
          message: 'Pattern detected: Similar discussion happened in previous meeting.',
          priority: 'low',
          timestamp: new Date(),
        },
        {
          id: String(Math.random()),
          type: 'suggestion',
          message: 'Consider assigning an owner to this action item for accountability.',
          priority: 'high',
          timestamp: new Date(),
        },
      ];
      const randomTip = newTips[Math.floor(Math.random() * newTips.length)];
      setTips((prev) => [randomTip, ...prev].slice(0, 5));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const getTypeIcon = (type: CoachingTip['type']) => {
    switch (type) {
      case 'suggestion':
        return <MessageCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'insight':
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: CoachingTip['type']) => {
    switch (type) {
      case 'suggestion':
        return 'from-blue-500 to-cyan-500';
      case 'warning':
        return 'from-orange-500 to-red-500';
      case 'insight':
        return 'from-purple-500 to-pink-500';
    }
  };

  const currentTip = tips[currentTipIndex];

  return (
    <Card className="border-0 bg-gradient-to-br from-background via-muted/10 to-background backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg"
            >
              <Brain className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-lg">AI Meeting Coach</CardTitle>
              <CardDescription>Live guidance & insights</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping absolute" />
            <span className="h-2 w-2 rounded-full bg-green-500 relative" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {/* Current Coaching Tip */}
        <AnimatePresence mode="wait">
          {currentTip && (
            <motion.div
              key={currentTip.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className={`p-4 rounded-lg bg-gradient-to-r ${getTypeColor(currentTip.type)} bg-opacity-10 border border-border/50`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getTypeColor(currentTip.type)} shadow-lg`}>
                  {getTypeIcon(currentTip.type)}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">{currentTip.message}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={currentTip.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                      {currentTip.priority} priority
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {currentTip.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2">
          {tips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTipIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentTipIndex ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-2">
            <MessageCircle className="h-3 w-3" />
            Ask Coach
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-2">
            <TrendingUp className="h-3 w-3" />
            Show Stats
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{tips.filter(t => t.type === 'suggestion').length}</div>
            <div className="text-xs text-muted-foreground">Suggestions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-secondary">{tips.filter(t => t.type === 'insight').length}</div>
            <div className="text-xs text-muted-foreground">Insights</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-destructive">{tips.filter(t => t.type === 'warning').length}</div>
            <div className="text-xs text-muted-foreground">Warnings</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
