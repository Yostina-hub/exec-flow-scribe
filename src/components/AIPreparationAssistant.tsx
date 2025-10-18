import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Target, AlertCircle, CheckCircle, Sparkles, ArrowRight, Lightbulb, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AIPreparationProps {
  meetingId: string;
  agendaCount: number;
  attendeeCount: number;
  startTime: string;
}

interface PreparationData {
  readiness: number;
  status: 'excellent' | 'good' | 'needs-attention' | 'critical';
  missingItems: string[];
  aiSuggestions: string[];
  timeUntil: number;
}

export function AIPreparationAssistant({ meetingId, agendaCount, attendeeCount, startTime }: AIPreparationProps) {
  const [preparation, setPreparation] = useState<PreparationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzePreparation();
  }, [agendaCount, attendeeCount]);

  const analyzePreparation = () => {
    const hoursUntil = (new Date(startTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    
    let readiness = 0;
    const missingItems: string[] = [];
    const suggestions: string[] = [];
    
    // Calculate readiness
    if (agendaCount > 0) {
      readiness += 40;
    } else {
      missingItems.push('Add agenda items');
      suggestions.push('Use AI to generate agenda from meeting title');
    }
    
    if (attendeeCount > 0) {
      readiness += 30;
    } else {
      missingItems.push('Invite attendees');
      suggestions.push('Import attendees from similar past meetings');
    }
    
    // Check if meeting has materials
    readiness += 30; // Assume some baseline prep
    
    if (hoursUntil < 24 && readiness < 70) {
      suggestions.push('Send pre-meeting brief to attendees');
    }
    
    if (agendaCount > 3) {
      suggestions.push('Consider breaking into multiple focused sessions');
    }
    
    const status = readiness >= 90 ? 'excellent' : 
                   readiness >= 70 ? 'good' : 
                   readiness >= 40 ? 'needs-attention' : 'critical';
    
    setPreparation({ readiness, status, missingItems, aiSuggestions: suggestions, timeUntil: hoursUntil });
    setLoading(false);
  };

  if (loading || !preparation) {
    return (
      <Card className="border-2">
        <CardContent className="flex items-center justify-center py-8">
          <Brain className="h-8 w-8 animate-pulse text-primary" />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    excellent: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500' },
    good: { icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500' },
    'needs-attention': { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500' },
    critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500' }
  };

  const config = statusConfig[preparation.status];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("border-2 animate-fade-in", config.border, config.bg)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Preparation Assistant
          </div>
          <Badge variant={preparation.readiness > 70 ? 'default' : 'destructive'} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {preparation.readiness}% Ready
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Readiness Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Meeting Readiness</span>
            <span className="font-medium">{preparation.readiness}%</span>
          </div>
          <Progress value={preparation.readiness} className="h-3" />
        </div>

        {/* Time Alert */}
        {preparation.timeUntil < 24 && (
          <div className={cn("flex items-center gap-2 p-3 rounded-lg", 
            preparation.timeUntil < 2 ? "bg-red-500/10" : "bg-orange-500/10"
          )}>
            <AlertCircle className={cn("h-4 w-4", 
              preparation.timeUntil < 2 ? "text-red-500" : "text-orange-500"
            )} />
            <span className="text-sm font-medium">
              Meeting starts in {Math.round(preparation.timeUntil)} hours
            </span>
          </div>
        )}

        {/* Missing Items */}
        {preparation.missingItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Action Required
            </div>
            <div className="space-y-1">
              {preparation.missingItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {preparation.aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              AI Recommendations
            </div>
            <div className="space-y-2">
              {preparation.aiSuggestions.map((suggestion, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors group cursor-pointer">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm flex-1">{suggestion}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {preparation.readiness < 100 && (
          <Button className="w-full gap-2" variant="outline">
            <Zap className="h-4 w-4" />
            Auto-Complete Preparation
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
