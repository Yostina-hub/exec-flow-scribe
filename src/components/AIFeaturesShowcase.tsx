import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Sparkles, 
  Zap, 
  MessageSquare, 
  FileText, 
  TrendingUp,
  Target,
  Lightbulb,
  Video,
  Mic,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface AIFeaturesShowcaseProps {
  onFeatureClick?: (feature: string) => void;
}

export const AIFeaturesShowcase = ({ onFeatureClick }: AIFeaturesShowcaseProps) => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const features = [
    {
      id: 'realtime-transcription',
      icon: Mic,
      title: 'Real-Time Transcription',
      description: 'AI-powered speech-to-text with speaker detection',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Live',
      capabilities: [
        'Multi-language support',
        'Speaker identification',
        'High accuracy (95%+)',
        'Real-time processing'
      ]
    },
    {
      id: 'ai-minutes',
      icon: FileText,
      title: 'Auto Minutes Generation',
      description: 'Intelligent meeting summaries with action items',
      color: 'from-purple-500 to-pink-500',
      badge: 'Smart',
      capabilities: [
        'Key points extraction',
        'Action items detection',
        'Decision tracking',
        'Summary generation'
      ]
    },
    {
      id: 'ai-copilot',
      icon: Brain,
      title: 'AI Meeting Copilot',
      description: 'Real-time insights and recommendations',
      color: 'from-orange-500 to-red-500',
      badge: 'Premium',
      capabilities: [
        'Context analysis',
        'Smart suggestions',
        'Risk detection',
        'Productivity metrics'
      ]
    },
    {
      id: 'smart-search',
      icon: Sparkles,
      title: 'Intelligent Search',
      description: 'Find anything across all meetings instantly',
      color: 'from-green-500 to-emerald-500',
      badge: 'Fast',
      capabilities: [
        'Semantic search',
        'Cross-meeting queries',
        'Context-aware results',
        'Natural language'
      ]
    },
    {
      id: 'predictive-analytics',
      icon: TrendingUp,
      title: 'Predictive Analytics',
      description: 'AI-driven insights and forecasting',
      color: 'from-yellow-500 to-orange-500',
      badge: 'Pro',
      capabilities: [
        'Trend analysis',
        'Outcome prediction',
        'Risk assessment',
        'Performance metrics'
      ]
    },
    {
      id: 'smart-recommendations',
      icon: Lightbulb,
      title: 'Smart Recommendations',
      description: 'AI suggests optimal meeting times and agendas',
      color: 'from-indigo-500 to-purple-500',
      badge: 'New',
      capabilities: [
        'Schedule optimization',
        'Agenda suggestions',
        'Participant matching',
        'Resource allocation'
      ]
    }
  ];

  return (
    <Card className="border-2 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Brain className="h-6 w-6 text-primary" />
              </motion.div>
              AI-Powered Features
            </CardTitle>
            <CardDescription className="mt-1">
              Advanced AI capabilities to supercharge your meetings
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Zap className="h-3 w-3" />
            6 Features
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grid">Feature Grid</TabsTrigger>
            <TabsTrigger value="details">Detailed View</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="group"
                  >
                    <Card className="h-full cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary/50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color}`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <Badge variant="outline">{feature.badge}</Badge>
                        </div>
                        <CardTitle className="text-lg mt-4">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="ghost"
                          className="w-full gap-2 group-hover:gap-3 transition-all"
                          onClick={() => onFeatureClick?.(feature.id)}
                        >
                          Learn More
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-2">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-xl bg-gradient-to-br ${feature.color} flex-shrink-0`}>
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-xl">{feature.title}</CardTitle>
                            <Badge variant="outline">{feature.badge}</Badge>
                          </div>
                          <CardDescription className="text-base">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Key Capabilities:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {feature.capabilities.map((capability, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
                            >
                              <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                              {capability}
                            </div>
                          ))}
                        </div>
                        <Button
                          className="w-full mt-4 gap-2"
                          onClick={() => onFeatureClick?.(feature.id)}
                        >
                          Try This Feature
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">95%+</p>
              <p className="text-xs text-muted-foreground">Accuracy Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">&lt;1s</p>
              <p className="text-xs text-muted-foreground">Response Time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">24/7</p>
              <p className="text-xs text-muted-foreground">Availability</p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};
