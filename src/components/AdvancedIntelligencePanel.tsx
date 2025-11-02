import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Film, 
  AlertCircle, 
  Sparkles, 
  FileText, 
  Shield, 
  Network, 
  TrendingUp,
  Loader2,
  Clock,
  Users,
  Target,
  Search
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface AdvancedIntelligencePanelProps {
  meetingId: string;
  userId: string;
}

export const AdvancedIntelligencePanel = ({ meetingId, userId }: AdvancedIntelligencePanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  
  // State for each feature
  const [decisionReplay, setDecisionReplay] = useState<any>(null);
  const [catchupCard, setCatchupCard] = useState<any>(null);
  const [coachHints, setCoachHints] = useState<any[]>([]);
  const [contextCapsule, setContextCapsule] = useState<any>(null);
  const [redactedDoc, setRedactedDoc] = useState<any>(null);
  const [knowledgeGraph, setKnowledgeGraph] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  
  // Input states
  const [selectedDecisionId, setSelectedDecisionId] = useState("");
  const [leftAtTime, setLeftAtTime] = useState("");
  const [contentToRedact, setContentToRedact] = useState("");
  const [graphQuery, setGraphQuery] = useState("");
  const [scenarios, setScenarios] = useState("Scenario A\nScenario B\nScenario C");

  const generateDecisionReplay = async () => {
    if (!selectedDecisionId) {
      toast({ title: "Please enter a decision ID", variant: "destructive" });
      return;
    }
    
    setLoading("replay");
    try {
      const { data, error } = await supabase.functions.invoke("generate-decision-replay", {
        body: { decision_id: selectedDecisionId }
      });
      
      if (error) throw error;
      setDecisionReplay(data);
      toast({ title: "Decision replay generated" });
    } catch (error: any) {
      const msg = error?.message || String(error);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Error generating replay',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
            Open Settings
          </Button>
        ),
      });
    } finally {
      setLoading(null);
    }
  };

  const generateCatchupCard = async () => {
    setLoading("catchup");
    try {
      const { data, error } = await supabase.functions.invoke("generate-catchup-card", {
        body: { 
          meeting_id: meetingId, 
          user_id: userId,
          left_at: leftAtTime || new Date(Date.now() - 600000).toISOString()
        }
      });
      
      if (error) throw error;
      setCatchupCard(data.catchup);
      toast({ title: "Catch-up card generated" });
    } catch (error: any) {
      const msg = error?.message || String(error);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Error generating catch-up',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
            Open Settings
          </Button>
        ),
      });
    } finally {
      setLoading(null);
    }
  };

  const generateCoachHints = async () => {
    setLoading("coach");
    try {
      const { data, error } = await supabase.functions.invoke("generate-coach-hints", {
        body: { meeting_id: meetingId, user_id: userId }
      });
      
      if (error) throw error;
      setCoachHints(data.hints);
      toast({ title: "Executive coaching hints generated" });
    } catch (error: any) {
      const msg = error?.message || String(error);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Error generating hints',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
            Open Settings
          </Button>
        ),
      });
    } finally {
      setLoading(null);
    }
  };

  const generateContextCapsule = async () => {
    setLoading("capsule");
    try {
      const { data, error } = await supabase.functions.invoke("generate-context-capsule", {
        body: { meeting_id: meetingId, user_id: userId }
      });
      
      if (error) throw error;
      setContextCapsule(data.capsule);
      toast({ title: "Context capsule generated" });
    } catch (error: any) {
      const msg = error?.message || String(error);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Error generating capsule',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
            Open Settings
          </Button>
        ),
      });
    } finally {
      setLoading(null);
    }
  };

  const generateRedactedVersion = async () => {
    if (!contentToRedact) {
      toast({ title: "Please enter content to redact", variant: "destructive" });
      return;
    }
    
    setLoading("redact");
    try {
      const { data, error } = await supabase.functions.invoke("generate-redacted-version", {
        body: { 
          meeting_id: meetingId, 
          user_id: userId,
          content: contentToRedact,
          audience_type: "broad_circulation"
        }
      });
      
      if (error) throw error;
      setRedactedDoc(data.document);
      toast({ title: "Redacted version created" });
    } catch (error: any) {
      const msg = error?.message || String(error);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Error generating redaction',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
            Open Settings
          </Button>
        ),
      });
    } finally {
      setLoading(null);
    }
  };

  const queryKnowledgeGraph = async () => {
    if (!graphQuery) {
      toast({ title: "Please enter a query", variant: "destructive" });
      return;
    }
    
    setLoading("graph");
    try {
      const { data, error } = await supabase.functions.invoke("query-knowledge-graph", {
        body: { query: graphQuery }
      });
      
      if (error) throw error;
      setKnowledgeGraph(data);
      toast({ title: "Knowledge graph queried" });
    } catch (error: any) {
      const msg = error?.message || String(error);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Error querying graph',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
            Open Settings
          </Button>
        ),
      });
    } finally {
      setLoading(null);
    }
  };

  const simulateOutcomes = async () => {
    if (!selectedDecisionId) {
      toast({ title: "Please enter a decision ID", variant: "destructive" });
      return;
    }
    
    setLoading("simulate");
    try {
      const scenarioList = scenarios.split('\n').filter(s => s.trim());
      const { data, error } = await supabase.functions.invoke("simulate-outcomes", {
        body: { 
          meeting_id: meetingId, 
          decision_id: selectedDecisionId,
          scenarios: scenarioList,
          user_id: userId
        }
      });
      
      if (error) throw error;
      setSimulations(data.simulations);
      toast({ title: "Outcome simulations generated" });
    } catch (error: any) {
      const msg = error?.message || String(error);
      const is402 = /Payment required|402|credits|Payment Required|💳/i.test(msg);
      const is429 = /Rate limit|429|Too Many Requests|⏳/i.test(msg);
      toast({
        title: is402 ? '💳 AI Credits Required' : is429 ? '⏳ Rate Limit Reached' : 'Error simulating outcomes',
        description: is402
          ? 'Go to Settings → AI Provider to add your OpenAI/Gemini API keys, or wait and try again.'
          : is429
          ? 'Temporarily rate limited. Wait 2–3 minutes and try again.'
          : msg,
        variant: 'destructive',
        duration: 10000,
        action: (
          <Button variant="outline" size="sm" onClick={() => (window.location.href = '/settings')}>
            Open Settings
          </Button>
        ),
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="replay" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="replay"><Film className="w-4 h-4 mr-1" />Replay</TabsTrigger>
          <TabsTrigger value="catchup"><AlertCircle className="w-4 h-4 mr-1" />Catch-Up</TabsTrigger>
          <TabsTrigger value="coach"><Sparkles className="w-4 h-4 mr-1" />Coach</TabsTrigger>
          <TabsTrigger value="capsule"><FileText className="w-4 h-4 mr-1" />Capsule</TabsTrigger>
          <TabsTrigger value="redact"><Shield className="w-4 h-4 mr-1" />Redact</TabsTrigger>
          <TabsTrigger value="graph"><Network className="w-4 h-4 mr-1" />Graph</TabsTrigger>
          <TabsTrigger value="simulate"><TrendingUp className="w-4 h-4 mr-1" />Simulate</TabsTrigger>
        </TabsList>

        {/* Decision Replay */}
        <TabsContent value="replay" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="w-5 h-5" />
                Decision Replay (Time Machine)
              </CardTitle>
              <CardDescription>
                Scrub through timeline to see only moments leading to a decision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Decision ID</label>
                <Input 
                  placeholder="Enter decision ID" 
                  value={selectedDecisionId}
                  onChange={(e) => setSelectedDecisionId(e.target.value)}
                />
              </div>
              <Button onClick={generateDecisionReplay} disabled={loading === "replay"}>
                {loading === "replay" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
                Generate Replay Timeline
              </Button>
              
              {decisionReplay && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Timeline Segments:</h4>
                  {decisionReplay.segments?.map((seg: any, idx: number) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{seg.context_before}</p>
                          <p className="text-xs text-muted-foreground mt-1">{seg.context_after}</p>
                          {seg.cited_data && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {seg.cited_data.map((data: string, i: number) => (
                                <Badge key={i} variant="outline">{data}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interruption Insurance */}
        <TabsContent value="catchup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Interruption Insurance
              </CardTitle>
              <CardDescription>
                Get a catch-up card if you stepped out mid-meeting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Left at (optional)</label>
                <Input 
                  type="datetime-local"
                  value={leftAtTime}
                  onChange={(e) => setLeftAtTime(e.target.value)}
                />
              </div>
              <Button onClick={generateCatchupCard} disabled={loading === "catchup"}>
                {loading === "catchup" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                Generate Catch-Up Card
              </Button>
              
              {catchupCard && (
                <div className="mt-4 space-y-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm">{catchupCard.key_changes?.summary}</p>
                  </div>
                  
                  {catchupCard.key_changes?.critical_updates && (
                    <div>
                      <h4 className="font-semibold mb-2">Critical Updates:</h4>
                      <ul className="space-y-1">
                        {catchupCard.key_changes.critical_updates.map((update: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Target className="w-4 h-4 mt-0.5 text-primary" />
                            {update}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {catchupCard.suggested_questions && (
                    <div>
                      <h4 className="font-semibold mb-2">Suggested Re-entry Questions:</h4>
                      <ul className="space-y-1">
                        {catchupCard.suggested_questions.map((q: string, i: number) => (
                          <li key={i} className="text-sm italic text-muted-foreground">"{q}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executive Coach */}
        <TabsContent value="coach" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Executive Coach Overlay
              </CardTitle>
              <CardDescription>
                Real-time coaching hints (private to you)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateCoachHints} disabled={loading === "coach"}>
                {loading === "coach" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Get Live Coaching Hints
              </Button>
              
              {coachHints.length > 0 && (
                <div className="space-y-2">
                  {coachHints
                    .sort((a, b) => b.priority - a.priority)
                    .map((hint, idx) => (
                      <Card key={idx} className="p-3 border-l-4 border-l-primary">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-2">{hint.hint_type}</Badge>
                            <p className="text-sm">{hint.hint_message}</p>
                          </div>
                          <Badge variant="secondary">P{hint.priority}</Badge>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Context Capsules */}
        <TabsContent value="capsule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Context Capsule
              </CardTitle>
              <CardDescription>
                90-second pre-read tailored to your role
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateContextCapsule} disabled={loading === "capsule"}>
                {loading === "capsule" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                Generate My Context Capsule
              </Button>
              
              {contextCapsule && (
                <div className="space-y-3">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium mb-2">Why you're here:</p>
                    <p className="text-sm">{contextCapsule.role_context}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Key Points:</h4>
                    <ul className="space-y-2">
                      {contextCapsule.key_points?.map((point: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Suggested Contribution:</p>
                    <p className="text-sm italic">{contextCapsule.suggested_contribution}</p>
                  </div>
                  
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    90 second read
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sensitivity Redaction */}
        <TabsContent value="redact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Sensitivity-Aware Redaction
              </CardTitle>
              <CardDescription>
                Auto-create broad circulation versions with smart masking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content to Redact</label>
                <Textarea 
                  placeholder="Paste meeting content here..." 
                  rows={6}
                  value={contentToRedact}
                  onChange={(e) => setContentToRedact(e.target.value)}
                />
              </div>
              <Button onClick={generateRedactedVersion} disabled={loading === "redact"}>
                {loading === "redact" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Generate Redacted Version
              </Button>
              
              {redactedDoc && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>{redactedDoc.sensitivity_level}</Badge>
                    <Badge variant="outline">{redactedDoc.audience_type}</Badge>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Redacted Content:</h4>
                    <p className="text-sm whitespace-pre-wrap">{redactedDoc.redacted_content}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Redaction Map:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(redactedDoc.redaction_map || {}).map(([key, values]: [string, any]) => (
                        <Badge key={key} variant="secondary">
                          {key}: {values.length} items
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Graph */}
        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Cross-Meeting Knowledge Graph
              </CardTitle>
              <CardDescription>
                Query: People ↔ Topics ↔ Decisions ↔ Outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Natural Language Query</label>
                <Input 
                  placeholder='e.g., "Show every decision touching Vendor X"' 
                  value={graphQuery}
                  onChange={(e) => setGraphQuery(e.target.value)}
                />
              </div>
              <Button onClick={queryKnowledgeGraph} disabled={loading === "graph"}>
                {loading === "graph" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Query Knowledge Graph
              </Button>
              
              {knowledgeGraph && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-2">Found Entities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {knowledgeGraph.entities?.map((entity: any) => (
                        <Badge key={entity.id} variant="outline">
                          {entity.entity_type}: {entity.entity_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Relationships:</h4>
                    <div className="space-y-2">
                      {knowledgeGraph.relationships?.map((rel: any, idx: number) => (
                        <Card key={idx} className="p-3">
                          <p className="text-sm">
                            <span className="font-medium">{rel.from_entity?.entity_name}</span>
                            {" → "}
                            <Badge variant="secondary" className="mx-1">{rel.relationship_type}</Badge>
                            {" → "}
                            <span className="font-medium">{rel.to_entity?.entity_name}</span>
                          </p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcome Simulator */}
        <TabsContent value="simulate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Outcome Simulator
              </CardTitle>
              <CardDescription>
                Simulate 2-3 scenarios with impact sketches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Decision ID</label>
                <Input 
                  placeholder="Enter decision ID" 
                  value={selectedDecisionId}
                  onChange={(e) => setSelectedDecisionId(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenarios (one per line)</label>
                <Textarea 
                  placeholder="Scenario A&#10;Scenario B&#10;Scenario C" 
                  rows={4}
                  value={scenarios}
                  onChange={(e) => setScenarios(e.target.value)}
                />
              </div>
              
              <Button onClick={simulateOutcomes} disabled={loading === "simulate"}>
                {loading === "simulate" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                Run Simulations
              </Button>
              
              {simulations.length > 0 && (
                <div className="space-y-3">
                  {simulations.map((sim, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{sim.scenario_name}</h4>
                          <div className="flex gap-2">
                            <Badge>Impact: {sim.impact_score}/100</Badge>
                            <Badge variant="outline">Confidence: {(sim.confidence_level * 100).toFixed(0)}%</Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{sim.scenario_description}</p>
                        
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <h5 className="text-sm font-medium mb-2">Projected Outcomes:</h5>
                          <dl className="text-sm space-y-1">
                            {Object.entries(sim.projected_outcomes || {}).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex gap-2">
                                <dt className="font-medium capitalize">{key}:</dt>
                                <dd className="text-muted-foreground">
                                  {typeof value === 'object' ? JSON.stringify(value) : value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        
                        {sim.assumptions && (
                          <div className="mt-2">
                            <h5 className="text-sm font-medium mb-1">Assumptions:</h5>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {sim.assumptions.map((assumption: string, i: number) => (
                                <li key={i}>• {assumption}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
