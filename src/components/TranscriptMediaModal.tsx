import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Film, Copy, AlertTriangle } from 'lucide-react';
import { MediaVault } from '@/components/minutes/MediaVault';
import { useToast } from '@/hooks/use-toast';

interface TranscriptSegment {
  id: string;
  speaker: string;
  content: string;
  timestamp: string;
  confidence: number;
  startTime: number;
  endTime: number;
}

interface TranscriptMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: TranscriptSegment[];
  meetingId: string;
  selectedSegment: TranscriptSegment | null;
  onSegmentSelect: (segment: TranscriptSegment) => void;
}

export function TranscriptMediaModal({
  open,
  onOpenChange,
  transcript,
  meetingId,
  selectedSegment,
  onSegmentSelect,
}: TranscriptMediaModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('transcript');

  const handleCopySegment = (content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied',
      description: 'Transcript segment copied to clipboard',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">Meeting Reference Materials</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none bg-muted/30 px-6">
            <TabsTrigger 
              value="transcript" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger 
              value="media" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Film className="w-4 h-4 mr-2" />
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="flex-1 m-0 overflow-hidden">
            <div className="h-full overflow-y-auto p-6 space-y-3">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No Transcript Available</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Start recording the meeting or upload audio to generate a transcript
                  </p>
                </div>
              ) : (
                transcript.map((segment) => (
                  <Card
                    key={segment.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedSegment?.id === segment.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-accent'
                    }`}
                    onClick={() => onSegmentSelect(segment)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs font-medium">
                              {segment.speaker}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                            {segment.confidence < 0.7 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Low Confidence
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => handleCopySegment(segment.content, e)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">{segment.content}</p>
                        <div className="mt-2">
                          <Badge
                            variant={
                              segment.confidence >= 0.9
                                ? 'default'
                                : segment.confidence >= 0.7
                                ? 'secondary'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {(segment.confidence * 100).toFixed(0)}% Confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="media" className="flex-1 m-0 p-6">
            <MediaVault meetingId={meetingId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
