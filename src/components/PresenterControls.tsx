import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Presentation, 
  Play, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Minimize2,
  Image,
  FileText,
  Video
} from 'lucide-react';

interface PresenterControlsProps {
  meetingId: string;
  isHost: boolean;
  onPresentationChange: (resource: any | null, slideIndex: number) => void;
}

export function PresenterControls({ meetingId, isHost, onPresentationChange }: PresenterControlsProps) {
  const { toast } = useToast();
  const [resources, setResources] = useState<any[]>([]);
  const [activePresentation, setActivePresentation] = useState<any | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [totalSlides, setTotalSlides] = useState(1);

  useEffect(() => {
    fetchResources();
    setupRealtimeSubscription();
  }, [meetingId]);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('meeting_resources')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });
    
    setResources(data || []);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`presenter-controls-${meetingId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_resources',
        filter: `meeting_id=eq.${meetingId}`,
      }, () => {
        fetchResources();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startPresenting = async (resource: any) => {
    if (!isHost) return;

    setActivePresentation(resource);
    setCurrentSlide(0);
    
    // Estimate slides for presentations (or set to 1 for single media)
    if (resource.type === 'presentation') {
      setTotalSlides(10); // Default estimate, will update based on actual content
    } else {
      setTotalSlides(1);
    }

    onPresentationChange(resource, 0);

    toast({
      title: "Presentation Started",
      description: `Now presenting: ${resource.title}`,
    });
  };

  const stopPresenting = () => {
    setActivePresentation(null);
    setCurrentSlide(0);
    setIsFullscreen(false);
    onPresentationChange(null, 0);

    toast({
      title: "Presentation Stopped",
      description: "Presentation has been ended",
    });
  };

  const nextSlide = () => {
    const next = Math.min(currentSlide + 1, totalSlides - 1);
    setCurrentSlide(next);
    onPresentationChange(activePresentation, next);
  };

  const prevSlide = () => {
    const prev = Math.max(currentSlide - 1, 0);
    setCurrentSlide(prev);
    onPresentationChange(activePresentation, prev);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    toast({
      title: isFullscreen ? "Minimized" : "Fullscreen",
      description: isFullscreen ? "Presentation minimized" : "Presentation in fullscreen",
    });
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'presentation': return <Presentation className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (!isHost) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Presenter Controls
          </CardTitle>
          <CardDescription>Only the host can control presentations</CardDescription>
        </CardHeader>
        <CardContent>
          {activePresentation ? (
            <div className="space-y-4">
              <Badge variant="secondary" className="w-full justify-center py-3">
                <Play className="h-4 w-4 mr-2 animate-pulse" />
                Currently Presenting: {activePresentation.title}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active presentation
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Presentation className="h-5 w-5" />
          Presenter Controls
        </CardTitle>
        <CardDescription>Control presentations and media display</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4">
        {activePresentation ? (
          <>
            {/* Active Presentation Panel */}
            <div className="space-y-4 p-4 rounded-lg border-2 border-primary bg-primary/5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getResourceIcon(activePresentation.type)}
                    <h3 className="font-semibold">{activePresentation.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {activePresentation.description}
                  </p>
                </div>
                <Badge variant="default" className="animate-pulse">
                  LIVE
                </Badge>
              </div>

              <Separator />

              {/* Slide Navigation */}
              {activePresentation.type === 'presentation' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevSlide}
                      disabled={currentSlide === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    <Badge variant="secondary" className="px-4 py-2">
                      Slide {currentSlide + 1} / {totalSlides}
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextSlide}
                      disabled={currentSlide === totalSlides - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="flex-1"
                    >
                      {isFullscreen ? (
                        <>
                          <Minimize2 className="h-4 w-4 mr-2" />
                          Minimize
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Fullscreen
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={stopPresenting}
                className="w-full"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Presenting
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Available Resources */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Available Resources</h3>
              <Badge variant="outline">{resources.length}</Badge>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2">
                {resources.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Presentation className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    No resources available yet
                    <p className="text-xs mt-2">Upload resources in the Media tab</p>
                  </div>
                ) : (
                  resources.map((resource) => (
                    <Card key={resource.id} className="p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getResourceIcon(resource.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{resource.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {resource.type}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => startPresenting(resource)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Present
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
