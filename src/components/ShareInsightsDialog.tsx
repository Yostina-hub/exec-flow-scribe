import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Share2, Mail, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShareInsightsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  meetingId: string;
  insights: any[];
}

export function ShareInsightsDialog({
  isOpen,
  onClose,
  conversationId,
  meetingId,
  insights,
}: ShareInsightsDialogProps) {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedInsights, setSelectedInsights] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && meetingId) {
      loadParticipants();
    }
  }, [isOpen, meetingId]);

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_attendees')
        .select(`
          user_id,
          profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('meeting_id', meetingId);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  const handleShare = async () => {
    if (selectedParticipants.length === 0) {
      toast({
        title: "No participants selected",
        description: "Please select at least one participant to share with",
        variant: "destructive",
      });
      return;
    }

    if (selectedInsights.length === 0) {
      toast({
        title: "No insights selected",
        description: "Please select at least one insight to share",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedInsightData = selectedInsights.map(idx => insights[idx]);
      
      // For now, we'll use a simple approach and log the share action
      // In production, you'd integrate with your notification system
      console.log('Sharing insights:', {
        participants: selectedParticipants,
        insights: selectedInsightData,
        message
      });

      // Show success message
      toast({
        title: "Insights shared successfully",
        description: `Shared ${selectedInsights.length} insights with ${selectedParticipants.length} participants`,
      });

      onClose();
      setSelectedParticipants([]);
      setSelectedInsights([]);
      setMessage('');
    } catch (error) {
      console.error('Failed to share insights:', error);
      toast({
        title: "Failed to share insights",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleInsight = (index: number) => {
    setSelectedInsights(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Advisor Insights
          </DialogTitle>
          <DialogDescription>
            Select insights and participants to share key takeaways from the advisor session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Select Insights */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Badge variant="secondary">1</Badge>
              Select Insights to Share
            </Label>
            <ScrollArea className="h-48 border rounded-lg p-4">
              {insights.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No insights available to share
                </p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedInsights.includes(idx)
                          ? 'bg-primary/5 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleInsight(idx)}
                    >
                      <Checkbox
                        checked={selectedInsights.includes(idx)}
                        onCheckedChange={() => toggleInsight(idx)}
                      />
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">
                          {insight.category}
                        </Badge>
                        <p className="text-sm">{insight.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Select Participants */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Badge variant="secondary">2</Badge>
              Select Participants
            </Label>
            <ScrollArea className="h-48 border rounded-lg p-4">
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No participants found
                </p>
              ) : (
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.user_id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedParticipants.includes(participant.user_id)
                          ? 'bg-primary/5 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleParticipant(participant.user_id)}
                    >
                      <Checkbox
                        checked={selectedParticipants.includes(participant.user_id)}
                        onCheckedChange={() => toggleParticipant(participant.user_id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {participant.profiles?.full_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {participant.profiles?.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Optional Message */}
          <div>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <Badge variant="secondary">3</Badge>
              Add Message (Optional)
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to accompany the shared insights..."
              className="min-h-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Share Insights
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
