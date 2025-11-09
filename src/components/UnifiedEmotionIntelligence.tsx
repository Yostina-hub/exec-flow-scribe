import { lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Sparkles, Search, LineChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const EmotionalAnalyticsDashboard = lazy(() => import("@/components/EmotionalAnalyticsDashboard").then(m => ({ default: m.EmotionalAnalyticsDashboard })));
const SpeakerEmotionalProfiles = lazy(() => import("@/components/SpeakerEmotionalProfiles").then(m => ({ default: m.SpeakerEmotionalProfiles })));
const SemanticSearchPanel = lazy(() => import("@/components/SemanticSearchPanel").then(m => ({ default: m.SemanticSearchPanel })));
const SemanticWaveform = lazy(() => import("@/components/SemanticWaveform").then(m => ({ default: m.SemanticWaveform })));

interface UnifiedEmotionIntelligenceProps {
  meetingId: string;
  onSemanticResultClick?: (timestamp: string) => void;
  onWaveformSeek?: (time: number) => void;
}

const LoadingFallback = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-64 w-full rounded-lg" />
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  </div>
);

export function UnifiedEmotionIntelligence({ 
  meetingId, 
  onSemanticResultClick,
  onWaveformSeek 
}: UnifiedEmotionIntelligenceProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <CardTitle>AI Intelligence Hub</CardTitle>
        </div>
        <CardDescription>
          Comprehensive emotion analysis, speaker insights, semantic search, and visual timeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics" className="gap-2">
              <LineChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="speakers" className="gap-2">
              <Brain className="h-4 w-4" />
              Speakers
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="waveform" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Waveform
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <EmotionalAnalyticsDashboard meetingId={meetingId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="speakers" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <SpeakerEmotionalProfiles meetingId={meetingId} />
            </Suspense>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <SemanticSearchPanel 
                meetingId={meetingId}
                onResultClick={onSemanticResultClick}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="waveform" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <SemanticWaveform 
                meetingId={meetingId}
                onSeek={onWaveformSeek || (() => {})}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
