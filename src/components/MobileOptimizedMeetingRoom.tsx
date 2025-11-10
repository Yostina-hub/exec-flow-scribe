import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MessageSquare, 
  Users, 
  MoreVertical,
  FileText,
  Hand,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileOptimizedMeetingRoomProps {
  meetingId: string;
  isHost: boolean;
  currentUserId: string;
  onCloseRoom?: () => void;
}

export const MobileOptimizedMeetingRoom = ({
  meetingId,
  isHost,
  currentUserId,
  onCloseRoom
}: MobileOptimizedMeetingRoomProps) => {
  const isMobile = useIsMobile();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState('video');

  if (!isMobile) {
    return null; // Use full VirtualMeetingRoom on desktop
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Video Area */}
      <div className="flex-1 bg-black relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm opacity-75">Video Conference</p>
          </div>
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <Badge variant="destructive" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Live
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCloseRoom}
              className="text-white hover:bg-white/20"
            >
              End
            </Button>
          </div>
        </div>

        {/* Participant Grid (Thumbnail View) */}
        <div className="absolute bottom-20 left-0 right-0 p-4">
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-24 h-32 bg-muted/20 rounded-lg border-2 border-white/20 backdrop-blur-sm"
                >
                  <div className="h-full flex items-center justify-center">
                    <Users className="h-8 w-8 text-white/50" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-card border-t p-4 safe-bottom">
        <div className="flex items-center justify-around mb-4">
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            className="rounded-full h-14 w-14"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            className="rounded-full h-14 w-14"
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button
            size="lg"
            variant={handRaised ? "default" : "secondary"}
            className="rounded-full h-14 w-14"
            onClick={() => setHandRaised(!handRaised)}
          >
            <Hand className={cn("h-5 w-5", handRaised && "text-yellow-500")} />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full h-14 w-14"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="participants" className="gap-2">
                    <Users className="h-4 w-4" />
                    People
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="mt-4">
                  <ScrollArea className="h-[60vh]">
                    <div className="space-y-3">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-sm font-medium mb-1">John Doe</p>
                        <p className="text-sm text-muted-foreground">
                          Welcome to the meeting!
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="participants" className="mt-4">
                  <ScrollArea className="h-[60vh]">
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">Participant {i}</p>
                              <p className="text-xs text-muted-foreground">
                                {i === 1 ? 'Host' : 'Attendee'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            <Mic className="h-3 w-3" />
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Meeting Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[50vh]">
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">
                            Notes and transcription will appear here...
                          </p>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Swipe up for more options
        </div>
      </div>
    </div>
  );
};
