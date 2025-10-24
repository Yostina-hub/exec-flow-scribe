import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Brain, 
  TrendingUp, 
  Lightbulb, 
  Target,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  FileText,
  Users,
  BarChart3
} from 'lucide-react';

interface AIMeetingCopilotProps {
  meetingId: string;
  currentUserId: string;
}

interface AIInsight {
  id: string;
  type: 'suggestion' | 'action' | 'context' | 'warning' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

export function AIMeetingCopilot({ meetingId, currentUserId }: AIMeetingCopilotProps) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [meetingContext, setMeetingContext] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    fetchMeetingContext();
    startRealtimeAnalysis();
  }, [meetingId]);

  const fetchMeetingContext = async () => {
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*, agenda_items(*), transcriptions(*), action_items(*), decisions(*)')
      .eq('id', meetingId)
      .single();

    setMeetingContext(meeting);
    if (meeting) {
      generateInitialInsights(meeting);
    }
  };

  const startRealtimeAnalysis = () => {
    const channel = supabase
      .channel(`ai-copilot-${meetingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transcriptions',
        filter: `meeting_id=eq.${meetingId}`,
      }, (payload) => {
        analyzeTranscript(payload.new);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'action_items',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        generateActionInsights();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const generateInitialInsights = async (meeting: any) => {
    setIsProcessing(true);
    
    try {
      const response = await supabase.functions.invoke('generate-meeting-insights', {
        body: { 
          meetingId,
          context: {
            agenda: meeting.agenda_items,
            previousActions: meeting.action_items,
            recentDecisions: meeting.decisions
          }
        }
      });

      if (response.data) {
        const newInsights: AIInsight[] = [
          {
            id: '1',
            type: 'context',
            title: 'Meeting Context Ready',
            description: `Analyzed ${meeting.agenda_items?.length || 0} agenda items and ${meeting.action_items?.length || 0} previous actions`,
            confidence: 0.95,
            timestamp: new Date().toISOString(),
            priority: 'medium'
          },
          {
            id: '2',
            type: 'suggestion',
            title: 'Key Focus Areas',
            description: 'Based on agenda, prioritize discussion on high-impact decisions and action item reviews',
            confidence: 0.88,
            timestamp: new Date().toISOString(),
            priority: 'high'
          }
        ];

        if (meeting.action_items?.some((a: any) => a.status === 'overdue')) {
          newInsights.push({
            id: '3',
            type: 'warning',
            title: 'Overdue Actions Detected',
            description: `${meeting.action_items.filter((a: any) => a.status === 'overdue').length} actions are overdue and need attention`,
            confidence: 1.0,
            timestamp: new Date().toISOString(),
            priority: 'high'
          });
        }

        setInsights(newInsights);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeTranscript = async (transcript: any) => {
    // Simulate AI analysis of transcript
    const keywords = ['decision', 'action', 'deadline', 'priority', 'concern', 'opportunity'];
    const content = transcript.content?.toLowerCase() || '';
    
    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        const newInsight: AIInsight = {
          id: Date.now().toString(),
          type: keyword === 'opportunity' ? 'opportunity' : keyword === 'concern' ? 'warning' : 'action',
          title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Detected`,
          description: `AI detected mention of "${keyword}" in recent discussion - consider documenting this`,
          confidence: 0.75,
          timestamp: new Date().toISOString(),
          priority: 'medium'
        };
        
        setInsights(prev => [newInsight, ...prev].slice(0, 20));
      }
    });
  };

  const generateActionInsights = () => {
    const newInsight: AIInsight = {
      id: Date.now().toString(),
      type: 'action',
      title: 'New Action Item Created',
      description: 'AI suggests reviewing assignment and deadline to ensure clarity',
      confidence: 0.85,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    };
    
    setInsights(prev => [newInsight, ...prev].slice(0, 20));
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'action': return <Target className="h-4 w-4 text-blue-500" />;
      case 'context': return <Brain className="h-4 w-4 text-purple-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-500" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 border-red-500/20 text-red-700';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700';
      case 'low': return 'bg-blue-500/10 border-blue-500/20 text-blue-700';
      default: return '';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          AI Meeting Copilot
        </CardTitle>
        <CardDescription>Real-time intelligent assistance powered by AI</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">
              <Sparkles className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="context">
              <FileText className="h-4 w-4 mr-2" />
              Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="flex-1 mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {isProcessing && (
                  <div className="flex items-center justify-center py-8">
                    <Sparkles className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Analyzing meeting context...
                    </span>
                  </div>
                )}

                {insights.map((insight) => (
                  <Card 
                    key={insight.id} 
                    className={`p-4 transition-all hover:shadow-md ${getPriorityColor(insight.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(insight.confidence * 100)}% confident
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(insight.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {insights.length === 0 && !isProcessing && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">AI Copilot is monitoring the meeting...</p>
                    <p className="text-xs mt-2">Insights will appear as the meeting progresses</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 mt-4">
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participation Metrics
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Speaking Balance</span>
                    <Badge variant="secondary">Balanced</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Engagement Level</span>
                    <Badge variant="default">High (87%)</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Decision Pace</span>
                    <Badge variant="outline">On Track</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Meeting Efficiency
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Agenda Progress</span>
                      <span className="text-muted-foreground">65%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[65%] transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Time Utilization</span>
                      <span className="text-muted-foreground">72%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[72%] transition-all" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Discussion Quality
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">12</div>
                    <div className="text-xs text-muted-foreground">Key Points</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-600">5</div>
                    <div className="text-xs text-muted-foreground">Decisions</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-600">8</div>
                    <div className="text-xs text-muted-foreground">Actions</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-purple-600">3</div>
                    <div className="text-xs text-muted-foreground">Blockers</div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="context" className="flex-1 mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold text-sm mb-3">Related Meetings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span>Q4 Planning - Nov 15</span>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <span>Strategy Review - Nov 8</span>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold text-sm mb-3">Relevant Documents</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <FileText className="h-4 w-4" />
                      <span className="flex-1">Q4 Strategic Plan.pdf</span>
                      <Button variant="ghost" size="sm">Open</Button>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <FileText className="h-4 w-4" />
                      <span className="flex-1">Budget Overview.xlsx</span>
                      <Button variant="ghost" size="sm">Open</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Smart Recommendations
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                      Consider inviting Finance team for budget discussion
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                      Schedule follow-up for pending action items
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                      Document key decisions in shared drive
                    </p>
                  </div>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
