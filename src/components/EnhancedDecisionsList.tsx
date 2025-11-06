import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, Plus, Search, Filter, TrendingUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface Decision {
  id: string;
  decision_text: string;
  created_at: string;
  created_by?: string;
  context?: string;
  timestamp?: string;
  meeting_id?: string;
}

interface EnhancedDecisionsListProps {
  meetingId: string;
  isHost: boolean;
}

export function EnhancedDecisionsList({ meetingId, isHost }: EnhancedDecisionsListProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDecision, setNewDecision] = useState('');
  const [decisionMaker, setDecisionMaker] = useState('');
  const [impactLevel, setImpactLevel] = useState('medium');
  const { toast } = useToast();

  useEffect(() => {
    fetchDecisions();

    // Real-time subscription
    const channel = supabase
      .channel('decisions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decisions',
          filter: `meeting_id=eq.${meetingId}`
        },
        () => {
          console.log('Decisions changed, refetching...');
          fetchDecisions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchDecisions = async () => {
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching decisions:', error);
      return;
    }

    setDecisions(data || []);
  };

  const addDecision = async () => {
    if (!newDecision.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('decisions')
      .insert({
        meeting_id: meetingId,
        decision_text: newDecision,
        created_by: user.id,
        context: decisionMaker || null
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add decision',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Decision Added',
      description: 'New decision has been recorded'
    });

    setNewDecision('');
    setDecisionMaker('');
    setImpactLevel('medium');
    setIsAddOpen(false);
  };

  const filteredDecisions = decisions.filter(decision => {
    const matchesSearch = decision.decision_text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Decisions Made
          </CardTitle>
          <Badge variant="secondary">{decisions.length} Total</Badge>
        </div>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {isHost && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Decision</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Decision</label>
                    <Textarea
                      value={newDecision}
                      onChange={(e) => setNewDecision(e.target.value)}
                      placeholder="Describe the decision..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Context (Optional)</label>
                    <Input
                      value={decisionMaker}
                      onChange={(e) => setDecisionMaker(e.target.value)}
                      placeholder="Additional context..."
                    />
                  </div>
                  <Button onClick={addDecision} className="w-full">
                    Record Decision
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <AnimatePresence>
          {filteredDecisions.map((decision, index) => (
            <motion.div
              key={decision.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="transition-all hover:shadow-md bg-background">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <CheckSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm leading-relaxed">{decision.decision_text}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {decision.context && (
                          <Badge variant="outline">
                            {decision.context}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {format(new Date(decision.created_at), 'MMM d, h:mm a')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredDecisions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{searchQuery ? 'No matching decisions' : 'No decisions recorded yet'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}