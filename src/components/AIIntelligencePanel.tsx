import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Calendar,
  FileText,
  Sparkles,
  Activity
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIIntelligencePanelProps {
  meetingId: string;
}

export function AIIntelligencePanel({ meetingId }: AIIntelligencePanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sentiments, setSentiments] = useState<any[]>([]);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [brief, setBrief] = useState<any>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

  useEffect(() => {
    fetchAIInsights();
  }, [meetingId]);

  const fetchAIInsights = async () => {
    try {
      // Fetch sentiments
      const { data: sentimentData } = await supabase
        .from('meeting_sentiment')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('segment_start');

      if (sentimentData) setSentiments(sentimentData);

      // Fetch commitments
      const { data: commitmentData } = await supabase
        .from('commitments')
        .select('*')
        .eq('meeting_id', meetingId);

      if (commitmentData) setCommitments(commitmentData);

      // Fetch suggestions
      const { data: suggestionData } = await supabase
        .from('meeting_suggestions')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (suggestionData) setSuggestions(suggestionData);

      // Fetch brief
      const { data: briefData } = await supabase
        .from('executive_briefs')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (briefData) setBrief(briefData);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    }
  };

  const runAnalysis = async (type: string) => {
    try {
      setLoading(true);
      setActiveAnalysis(type);

      const { data: user } = await supabase.auth.getUser();
      
      let endpoint = '';
      let payload: any = { meeting_id: meetingId };

      switch (type) {
        case 'sentiment':
          endpoint = 'analyze-meeting-sentiment';
          break;
        case 'commitment':
          endpoint = 'track-commitment-delta';
          break;
        case 'suggestion':
          endpoint = 'suggest-next-meeting';
          break;
        case 'brief':
          endpoint = 'generate-executive-brief';
          payload.user_id = user?.user?.id;
          break;
      }

      const { error } = await supabase.functions.invoke(endpoint, { body: payload });

      if (error) throw error;

      toast({
        title: 'Analysis Complete',
        description: `${type} analysis has been generated successfully`,
      });

      fetchAIInsights();
    } catch (error: any) {
      console.error(`Error running ${type} analysis:`, error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to run analysis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setActiveAnalysis(null);
    }
  };

  const getSentimentIcon = (label: string) => {
    if (label === 'positive' || label === 'optimistic') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (label === 'negative' || label === 'tension') return <TrendingDown className="w-4 h-4 text-red-500" />;
    if (label === 'hesitant') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <Activity className="w-4 h-4 text-blue-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'fulfilled') return 'default';
    if (status === 'partial') return 'secondary';
    if (status === 'missed') return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Intelligence & Insights
          </CardTitle>
          <CardDescription>
            Forward-looking analytics powered by AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Button
              onClick={() => runAnalysis('sentiment')}
              disabled={loading}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
            >
              <Activity className="w-6 h-6" />
              <span className="text-xs">Sentiment Radar</span>
              {loading && activeAnalysis === 'sentiment' && (
                <span className="text-xs text-muted-foreground">Analyzing...</span>
              )}
            </Button>

            <Button
              onClick={() => runAnalysis('commitment')}
              disabled={loading}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
            >
              <Target className="w-6 h-6" />
              <span className="text-xs">Commitment Delta</span>
              {loading && activeAnalysis === 'commitment' && (
                <span className="text-xs text-muted-foreground">Analyzing...</span>
              )}
            </Button>

            <Button
              onClick={() => runAnalysis('suggestion')}
              disabled={loading}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs">Next Meeting</span>
              {loading && activeAnalysis === 'suggestion' && (
                <span className="text-xs text-muted-foreground">Predicting...</span>
              )}
            </Button>

            <Button
              onClick={() => runAnalysis('brief')}
              disabled={loading}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2"
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs">Executive Brief</span>
              {loading && activeAnalysis === 'brief' && (
                <span className="text-xs text-muted-foreground">Generating...</span>
              )}
            </Button>
          </div>

          <Tabs defaultValue="sentiment" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
              <TabsTrigger value="commitments">Commitments</TabsTrigger>
              <TabsTrigger value="suggestions">Next Meeting</TabsTrigger>
              <TabsTrigger value="brief">Brief</TabsTrigger>
            </TabsList>

            <TabsContent value="sentiment" className="space-y-4">
              {sentiments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No sentiment analysis yet</p>
                  <p className="text-sm">Click "Sentiment Radar" to analyze meeting sentiment</p>
                </div>
              ) : (
                sentiments.map((sentiment) => (
                  <Card key={sentiment.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getSentimentIcon(sentiment.sentiment_label)}
                            <span className="font-medium">{sentiment.topic}</span>
                          </div>
                          <Badge variant={sentiment.sentiment_score > 0.3 ? 'default' : sentiment.sentiment_score < -0.3 ? 'destructive' : 'secondary'}>
                            {sentiment.sentiment_label}
                          </Badge>
                        </div>
                        
                        {sentiment.key_phrases && sentiment.key_phrases.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sentiment.key_phrases.map((phrase: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {phrase}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {sentiment.risk_indicators && sentiment.risk_indicators.length > 0 && (
                          <div className="flex items-start gap-2 text-sm text-destructive">
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                            <div>
                              <strong>Risks:</strong> {sentiment.risk_indicators.join(', ')}
                            </div>
                          </div>
                        )}

                        {sentiment.compliance_concerns && sentiment.compliance_concerns.length > 0 && (
                          <div className="flex items-start gap-2 text-sm text-yellow-600">
                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                            <div>
                              <strong>Compliance:</strong> {sentiment.compliance_concerns.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="commitments" className="space-y-4">
              {commitments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No commitment tracking yet</p>
                  <p className="text-sm">Click "Commitment Delta" to analyze what was said vs what was done</p>
                </div>
              ) : (
                commitments.map((commitment) => (
                  <Card key={commitment.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <p className="font-medium">{commitment.commitment_text}</p>
                          <Badge variant={getStatusColor(commitment.status)}>
                            {commitment.status}
                          </Badge>
                        </div>

                        {commitment.drift_score !== null && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  commitment.drift_score < 0.3 ? 'bg-green-500' :
                                  commitment.drift_score < 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${commitment.drift_score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(commitment.drift_score * 100)}% drift
                            </span>
                          </div>
                        )}

                        {commitment.fulfillment_evidence && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Reality:</strong> {commitment.fulfillment_evidence}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No meeting suggestions yet</p>
                  <p className="text-sm">Click "Next Meeting" to get AI-powered agenda suggestions</p>
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <Card key={suggestion.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{suggestion.suggested_title}</CardTitle>
                          <CardDescription>
                            Suggested for: {new Date(suggestion.suggested_for).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge>{Math.round(suggestion.priority_score * 100)}% priority</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Reasoning</h4>
                        <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Proposed Agenda</h4>
                        <div className="space-y-2">
                          {suggestion.suggested_agenda?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{item.topic}</span>
                              <Badge variant="outline">{item.duration_minutes} min</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {suggestion.open_threads} open threads
                        </Badge>
                        <Badge variant="secondary">
                          {suggestion.unresolved_risks} risks
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="brief" className="space-y-4">
              {!brief ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No executive brief yet</p>
                  <p className="text-sm">Click "Executive Brief" to generate a pre-meeting summary</p>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Executive Brief
                    </CardTitle>
                    <CardDescription>
                      Generated: {new Date(brief.generated_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {brief.key_insights && brief.key_insights.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Insights</h4>
                        <ul className="space-y-1">
                          {brief.key_insights.map((insight: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {brief.action_status_summary && (
                      <div>
                        <h4 className="font-semibold mb-2">Action Status</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="p-2 bg-muted rounded text-center">
                            <div className="text-2xl font-bold">{brief.action_status_summary.total}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                          <div className="p-2 bg-green-500/10 rounded text-center">
                            <div className="text-2xl font-bold text-green-600">{brief.action_status_summary.completed}</div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                          </div>
                          <div className="p-2 bg-yellow-500/10 rounded text-center">
                            <div className="text-2xl font-bold text-yellow-600">{brief.action_status_summary.at_risk}</div>
                            <div className="text-xs text-muted-foreground">At Risk</div>
                          </div>
                          <div className="p-2 bg-red-500/10 rounded text-center">
                            <div className="text-2xl font-bold text-red-600">{brief.action_status_summary.blocked}</div>
                            <div className="text-xs text-muted-foreground">Blocked</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {brief.risk_alerts && brief.risk_alerts.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          Risk Alerts
                        </h4>
                        <ul className="space-y-1">
                          {brief.risk_alerts.map((risk: string, i: number) => (
                            <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                              <span>⚠️</span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {brief.recommended_focus && brief.recommended_focus.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Recommended Focus</h4>
                        <div className="flex flex-wrap gap-2">
                          {brief.recommended_focus.map((focus: string, i: number) => (
                            <Badge key={i} variant="default">{focus}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {brief.brief_content?.one_page_brief && (
                      <div>
                        <h4 className="font-semibold mb-2">Full Brief</h4>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{brief.brief_content.one_page_brief}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
