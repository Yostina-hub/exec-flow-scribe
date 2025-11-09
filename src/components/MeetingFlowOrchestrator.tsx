import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { 
  ListChecks, 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  ArrowRight,
  Calendar,
  PlayCircle,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface MeetingFlowOrchestratorProps {
  meetingId: string;
  meetingDuration: number;
  startTime: string;
}

interface AgendaItem {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  order_index: number;
  status: string;
  priority: 'high' | 'medium' | 'low';
  timeAllocated: number;
  timeSpent: number;
}

export function MeetingFlowOrchestrator({ 
  meetingId, 
  meetingDuration, 
  startTime 
}: MeetingFlowOrchestratorProps) {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(meetingDuration);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchAgendaItems();
    const interval = setInterval(updateProgress, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [meetingId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const meetingStart = new Date(startTime);
      const elapsed = (Date.now() - meetingStart.getTime()) / (1000 * 60);
      const remaining = Math.max(0, meetingDuration - elapsed);
      setTimeRemaining(Math.round(remaining));
    }, 10000); // Update every 10s

    return () => clearInterval(timer);
  }, [startTime, meetingDuration]);

  const fetchAgendaItems = async () => {
    try {
      const { data: items } = await supabase
        .from('agenda_items')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('order_index', { ascending: true });

      if (!items) return;

      const enhancedItems: AgendaItem[] = items.map((item, index) => ({
        ...item,
        priority: determinePriority(item),
        timeAllocated: item.duration_minutes || meetingDuration / items.length,
        timeSpent: item.status === 'completed' ? (item.duration_minutes || 0) : 0
      }));

      setAgendaItems(enhancedItems);
      
      // Find current item
      const currentIndex = enhancedItems.findIndex(item => item.status === 'in_progress');
      if (currentIndex !== -1) {
        setCurrentItemIndex(currentIndex);
      }

      generateSuggestions(enhancedItems);
    } catch (error) {
      console.error('Error fetching agenda items:', error);
    }
  };

  const determinePriority = (item: any): 'high' | 'medium' | 'low' => {
    // Simple heuristic based on keywords
    const highPriorityKeywords = ['critical', 'urgent', 'important', 'decision'];
    const title = item.title?.toLowerCase() || '';
    const desc = item.description?.toLowerCase() || '';
    
    if (highPriorityKeywords.some(kw => title.includes(kw) || desc.includes(kw))) {
      return 'high';
    }
    return item.duration_minutes > 15 ? 'medium' : 'low';
  };

  const updateProgress = () => {
    if (agendaItems.length === 0) return;
    
    const completedItems = agendaItems.filter(item => item.status === 'completed').length;
    const progress = (completedItems / agendaItems.length) * 100;
    setOverallProgress(Math.round(progress));
  };

  const generateSuggestions = (items: AgendaItem[]) => {
    const newSuggestions: string[] = [];
    const completedCount = items.filter(i => i.status === 'completed').length;
    const totalTime = items.reduce((sum, i) => sum + i.timeAllocated, 0);
    const spentTime = items.reduce((sum, i) => sum + i.timeSpent, 0);

    if (timeRemaining < totalTime * 0.3 && completedCount < items.length * 0.5) {
      newSuggestions.push('Consider prioritizing remaining items or scheduling follow-up');
    }

    if (completedCount > items.length * 0.7 && timeRemaining > meetingDuration * 0.3) {
      newSuggestions.push('Great progress! Time available for deep dive on key items');
    }

    const highPriorityPending = items.filter(i => i.priority === 'high' && i.status === 'pending');
    if (highPriorityPending.length > 0) {
      newSuggestions.push(`${highPriorityPending.length} high-priority items remaining`);
    }

    setSuggestions(newSuggestions);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle2;
      case 'in_progress':
        return PlayCircle;
      default:
        return Circle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      default:
        return 'muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Meeting Flow Orchestrator
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {overallProgress}% Complete
            </Badge>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <Clock className="h-3 w-3 mr-1" />
              {timeRemaining}m left
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold">
              {agendaItems.filter(i => i.status === 'completed').length}/{agendaItems.length} items
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{suggestion}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Agenda Timeline */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Agenda Timeline</p>
          <div className="space-y-2">
            <AnimatePresence>
              {agendaItems.map((item, index) => {
                const StatusIcon = getStatusIcon(item.status);
                const statusColor = getStatusColor(item.status);
                const priorityColor = getPriorityColor(item.priority);
                const isActive = index === currentItemIndex;

                return (
                  <motion.div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive 
                        ? 'bg-primary/10 border-primary shadow-md' 
                        : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full bg-${statusColor}/10 flex-shrink-0`}>
                        <StatusIcon className={`h-4 w-4 text-${statusColor}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{item.title}</h4>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 bg-${priorityColor}/10 text-${priorityColor} border-${priorityColor}/20`}>
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.timeAllocated}m allocated
                            </span>
                            {item.status === 'completed' && (
                              <span className="text-success">✓ Done</span>
                            )}
                          </div>
                          
                          {isActive && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 animate-pulse">
                              <span className="mr-1">•</span> Current
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {isActive && item.status === 'in_progress' && (
                      <div className="mt-2 pt-2 border-t">
                        <Progress value={50} className="h-1" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Actions */}
        {agendaItems.length > 0 && (
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs"
              onClick={() => window.location.reload()}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              variant="default" 
              className="flex-1 text-xs"
            >
              Suggest Reorder
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
