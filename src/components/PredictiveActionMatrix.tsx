import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Target, Zap, TrendingUp, Clock, CheckCircle2, Sparkles } from "lucide-react";

interface PredictedAction {
  id: string;
  title: string;
  probability: number;
  urgency: 'immediate' | 'soon' | 'later';
  category: 'followup' | 'decision' | 'task' | 'meeting';
  preDraft: string;
  reasoning: string;
}

interface PredictiveActionMatrixProps {
  meetingId: string;
  onAcceptAction: (action: PredictedAction) => void;
}

export const PredictiveActionMatrix = ({ meetingId, onAcceptAction }: PredictiveActionMatrixProps) => {
  const [predictedActions, setPredictedActions] = useState<PredictedAction[]>([
    {
      id: '1',
      title: 'Schedule Q1 Budget Review Meeting',
      probability: 92,
      urgency: 'immediate',
      category: 'meeting',
      preDraft: 'Based on today\'s discussion, schedule a follow-up meeting with finance team to review Q1 budget allocation within the next 48 hours.',
      reasoning: 'Multiple references to budget concerns and deadline pressure detected'
    },
    {
      id: '2',
      title: 'Send Stakeholder Update Email',
      probability: 88,
      urgency: 'soon',
      category: 'followup',
      preDraft: 'Hi team,\n\nFollowing our strategic meeting today, I wanted to update you on the key decisions made...',
      reasoning: 'CEO mentioned needing to communicate decisions to broader team'
    },
    {
      id: '3',
      title: 'Create Engineering Hiring Plan',
      probability: 85,
      urgency: 'soon',
      category: 'task',
      preDraft: 'Draft a comprehensive hiring plan for 15% engineering team expansion, including role definitions, timeline, and budget requirements.',
      reasoning: 'Decision made to expand engineering team by 15%'
    }
  ]);

  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return 'from-red-500 to-rose-600';
      case 'soon': return 'from-amber-500 to-orange-600';
      case 'later': return 'from-blue-500 to-cyan-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'meeting': return Clock;
      case 'followup': return TrendingUp;
      case 'task': return Target;
      case 'decision': return Zap;
      default: return Sparkles;
    }
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Target className="h-6 w-6 text-primary" />
              <motion.div
                className="absolute inset-0 bg-primary/30 rounded-full blur-xl"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
            <div>
              <h3 className="font-bold text-lg">Predictive Action Matrix</h3>
              <p className="text-xs text-muted-foreground">AI pre-drafts your next steps</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-2 animate-pulse">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span className="text-xs">Live Prediction</span>
          </Badge>
        </div>

        {/* Predicted actions list */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {predictedActions.map((action, index) => {
            const Icon = getCategoryIcon(action.category);
            const isExpanded = expandedAction === action.id;

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isExpanded
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Probability indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary/50 to-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${action.probability}%` }}
                    transition={{ duration: 1, delay: index * 0.15 }}
                  />
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${getUrgencyColor(action.urgency)}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm">{action.title}</h4>
                        <p className="text-xs text-muted-foreground italic">{action.reasoning}</p>
                      </div>
                      <Badge variant="outline" className="text-xs ml-2">
                        {action.probability}% likely
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {action.category}
                      </Badge>
                      <Badge 
                        variant={action.urgency === 'immediate' ? 'destructive' : 'outline'} 
                        className="text-xs"
                      >
                        {action.urgency}
                      </Badge>
                    </div>

                    {/* Pre-drafted content (expandable) */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                    >
                      {isExpanded ? 'Hide' : 'View'} AI Pre-Draft
                    </Button>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-3 pt-2 border-t border-border"
                      >
                        <div className="p-3 rounded bg-muted/50 border border-border/50">
                          <p className="text-xs whitespace-pre-wrap">{action.preDraft}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 gap-2"
                            onClick={() => onAcceptAction(action)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Accept & Create
                          </Button>
                          <Button size="sm" variant="outline">
                            Modify
                          </Button>
                          <Button size="sm" variant="ghost">
                            Dismiss
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
