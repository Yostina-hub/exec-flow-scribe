import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Sparkles, 
  Zap, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  Info,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AIGenerationInsightsProps {
  meetingId: string;
}

export function AIGenerationInsights({ meetingId }: AIGenerationInsightsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - in real implementation, fetch from API
  const generationData = {
    provider: 'Lovable AI',
    model: 'google/gemini-2.5-flash',
    language: 'Amharic (አማርኛ)',
    completeness: 94,
    accuracy: 96,
    generationTime: 23,
    transcriptCoverage: 92,
    features: [
      'Multi-language support',
      'Real-time processing',
      'Context-aware generation',
      'Cultural sensitivity',
      'Professional formatting'
    ],
    metrics: {
      decisions_captured: 8,
      action_items_extracted: 12,
      speakers_identified: 6,
      agenda_items_covered: 5
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Generation Insights</CardTitle>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {generationData.model}
          </Badge>
        </div>
        <CardDescription>
          Understand how AI processes and generates your meeting content
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* AI Provider Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    AI Provider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Provider</span>
                      <Badge>{generationData.provider}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Model</span>
                      <span className="text-sm font-medium">{generationData.model}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Generation Time</span>
                      <Badge variant="outline">{generationData.generationTime}s</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Language Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Detected Language</span>
                      <Badge variant="secondary">{generationData.language}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Script</span>
                      <span className="text-sm font-medium">Ge'ez (ግዕዝ)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Punctuation</span>
                      <span className="text-sm">። ፣ ፤ ፦</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  Content Extraction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {generationData.metrics.decisions_captured}
                    </div>
                    <div className="text-xs text-muted-foreground">Decisions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {generationData.metrics.action_items_extracted}
                    </div>
                    <div className="text-xs text-muted-foreground">Action Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {generationData.metrics.speakers_identified}
                    </div>
                    <div className="text-xs text-muted-foreground">Speakers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {generationData.metrics.agenda_items_covered}
                    </div>
                    <div className="text-xs text-muted-foreground">Agenda Items</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Features */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {generationData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="process" className="space-y-4">
            <div className="space-y-4">
              {/* Generation Pipeline */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Data Collection</h4>
                    <p className="text-sm text-muted-foreground">
                      Gathering transcripts, decisions, agenda, and participant data
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>

                <div className="ml-4 border-l-2 border-muted h-8"></div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Language Detection</h4>
                    <p className="text-sm text-muted-foreground">
                      Analyzing script and determining primary language
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>

                <div className="ml-4 border-l-2 border-muted h-8"></div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Prompt Construction</h4>
                    <p className="text-sm text-muted-foreground">
                      Building context-aware instructions for AI model
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>

                <div className="ml-4 border-l-2 border-muted h-8"></div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">AI Generation</h4>
                    <p className="text-sm text-muted-foreground">
                      Processing with {generationData.model}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>

                <div className="ml-4 border-l-2 border-muted h-8"></div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    5
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Quality Assurance</h4>
                    <p className="text-sm text-muted-foreground">
                      Validating structure, language, and completeness
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>

                <div className="ml-4 border-l-2 border-muted h-8"></div>

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    6
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Storage & Versioning</h4>
                    <p className="text-sm text-muted-foreground">
                      Saving to database with version control
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            {/* Quality Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Quality Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completeness</span>
                    <span className="text-sm text-muted-foreground">
                      {generationData.completeness}%
                    </span>
                  </div>
                  <Progress value={generationData.completeness} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Accuracy</span>
                    <span className="text-sm text-muted-foreground">
                      {generationData.accuracy}%
                    </span>
                  </div>
                  <Progress value={generationData.accuracy} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Transcript Coverage</span>
                    <span className="text-sm text-muted-foreground">
                      {generationData.transcriptCoverage}%
                    </span>
                  </div>
                  <Progress value={generationData.transcriptCoverage} />
                </div>
              </CardContent>
            </Card>

            {/* Quality Indicators */}
            <div className="grid gap-3">
              <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-green-900 dark:text-green-100">
                        High Fidelity
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Content strictly follows transcript without fabrication
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">
                        Language Consistency
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Proper Amharic grammar, Ge'ez script, and Ethiopian punctuation
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-purple-900 dark:text-purple-100">
                        Fast Generation
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Processed in {generationData.generationTime} seconds
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Learn More */}
        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">About AI Generation</h4>
              <p className="text-sm text-muted-foreground mb-3">
                This meeting uses Lovable AI with Google's Gemini 2.5 Flash model, optimized for 
                accurate multi-language processing. The AI analyzes your meeting data through 
                a 6-stage pipeline to generate comprehensive, culturally-aware minutes.
              </p>
              <Button variant="outline" size="sm">
                View Full Documentation
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
