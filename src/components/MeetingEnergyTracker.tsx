import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface MeetingEnergyTrackerProps {
  meetingId: string;
}

export const MeetingEnergyTracker = ({ meetingId }: MeetingEnergyTrackerProps) => {
  const [energyLevel, setEnergyLevel] = useState(75);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    // Simulate real-time energy tracking
    const interval = setInterval(() => {
      const change = Math.random() * 20 - 10;
      setEnergyLevel((prev) => {
        const newLevel = Math.max(0, Math.min(100, prev + change));
        if (change > 3) setTrend('up');
        else if (change < -3) setTrend('down');
        else setTrend('stable');
        return newLevel;
      });
      setPulse((prev) => (prev + 1) % 100);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getEnergyColor = () => {
    if (energyLevel > 70) return 'from-green-500 to-emerald-500';
    if (energyLevel > 40) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-background via-muted/10 to-background backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5 animate-pulse" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`h-10 w-10 rounded-full bg-gradient-to-br ${getEnergyColor()} flex items-center justify-center shadow-lg`}
            >
              <Zap className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-lg">Meeting Energy</CardTitle>
              <CardDescription>Real-time engagement pulse</CardDescription>
            </div>
          </div>
          {getTrendIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div className="flex items-end justify-between">
          <div>
            <motion.div
              className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              animate={{ scale: trend === 'up' ? [1, 1.1, 1] : 1 }}
            >
              {Math.round(energyLevel)}%
            </motion.div>
            <p className="text-sm text-muted-foreground mt-1">
              {energyLevel > 70 ? 'High engagement' : energyLevel > 40 ? 'Moderate engagement' : 'Low engagement - consider break'}
            </p>
          </div>
          <Badge
            variant={energyLevel > 70 ? 'default' : energyLevel > 40 ? 'secondary' : 'destructive'}
            className="animate-pulse"
          >
            {energyLevel > 70 ? '🔥 On Fire' : energyLevel > 40 ? '⚡ Active' : '😴 Fatigue'}
          </Badge>
        </div>

        {/* Energy Wave Visualization */}
        <div className="h-20 relative overflow-hidden rounded-lg bg-muted/20">
          <svg className="w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
            <motion.path
              d={`M 0 ${80 - energyLevel * 0.6} Q 100 ${80 - energyLevel * 0.8}, 200 ${80 - energyLevel * 0.6} T 400 ${80 - energyLevel * 0.6}`}
              fill="none"
              stroke="url(#energyGradient)"
              strokeWidth="3"
              animate={{ d: pulse }}
            />
            <defs>
              <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* AI Recommendations */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground">💡 AI Recommendations</p>
          {energyLevel < 40 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Consider a 5-minute break to recharge</p>
          )}
          {energyLevel > 70 && (
            <p className="text-xs text-green-600 dark:text-green-400">Perfect time for important decisions</p>
          )}
          {trend === 'down' && energyLevel < 60 && (
            <p className="text-xs text-blue-600 dark:text-blue-400">Try interactive polls to boost engagement</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
