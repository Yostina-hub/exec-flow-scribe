import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  User, 
  CheckCircle2, 
  Circle, 
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  order_index: number;
  status: 'pending' | 'in_progress' | 'completed';
  presenter_id: string | null;
  created_at?: string;
  updated_at?: string;
  meeting_id?: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface EnhancedAgendaListProps {
  meetingId: string;
  isHost: boolean;
}

export function EnhancedAgendaList({ meetingId, isHost }: EnhancedAgendaListProps) {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [currentItem, setCurrentItem] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgenda();

    // Real-time subscription
    const channel = supabase
      .channel('agenda-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agenda_items',
          filter: `meeting_id=eq.${meetingId}`
        },
        () => {
          console.log('Agenda changed, refetching...');
          fetchAgenda();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchAgenda = async () => {
    const { data, error } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching agenda:', error);
      return;
    }

    setAgendaItems(data || []);
    
    // Set current item to first in-progress or pending
    const current = data?.find(item => 
      item.status === 'in_progress' || item.status === 'pending'
    );
    if (current) setCurrentItem(current.id);
  };

  const updateStatus = async (itemId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    const { error } = await supabase
      .from('agenda_items')
      .update({ 
        status: newStatus
      })
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update agenda item',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Updated',
      description: `Agenda item marked as ${newStatus}`,
    });
  };

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const completedCount = agendaItems.filter(item => item.status === 'completed').length;
  const progress = agendaItems.length > 0 
    ? (completedCount / agendaItems.length) * 100 
    : 0;

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === 'in_progress') return <Play className="h-5 w-5 text-blue-500 animate-pulse" />;
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500/10 border-green-500/20';
    if (status === 'in_progress') return 'bg-blue-500/10 border-blue-500/20';
    return 'bg-background border-border';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Meeting Agenda
          </CardTitle>
          <Badge variant="secondary">
            {completedCount}/{agendaItems.length} Complete
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence>
          {agendaItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`${getStatusColor(item.status)} transition-all hover:shadow-md`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{index + 1}.</span>
                          <h4 className="font-medium">{item.title}</h4>
                          {item.id === currentItem && (
                            <Badge variant="default" className="animate-pulse">
                              Current
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(item.id)}
                        >
                          {expandedItems.has(item.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <AnimatePresence>
                        {expandedItems.has(item.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            {item.description && (
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs">
                              {item.duration_minutes && (
                                <Badge variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.duration_minutes} min
                                </Badge>
                              )}
                              {item.presenter_id && (
                                <Badge variant="outline" className="gap-1">
                                  <User className="h-3 w-3" />
                                  Presenter: {item.presenter_id.slice(0, 8)}...
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isHost && item.status !== 'completed' && (
                        <div className="flex gap-2">
                          {item.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(item.id, 'in_progress')}
                              className="gap-2"
                            >
                              <Play className="h-3 w-3" />
                              Start
                            </Button>
                          )}
                          {item.status === 'in_progress' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus(item.id, 'pending')}
                                className="gap-2"
                              >
                                <Pause className="h-3 w-3" />
                                Pause
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateStatus(item.id, 'completed')}
                                className="gap-2 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Complete
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {agendaItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No agenda items yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}